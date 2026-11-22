import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scopeContrasts, scopeContrastCases, scopeContrastDocuments } from '../../../../dist/src/evaluation/scope-contrast-cases.js';
import { referenceAdmission } from '../../../../dist/src/evaluation/scope-reference.js';
import { queryScopeScores } from '../../../../dist/src/evaluation/query-scope-metrics.js';
import { countTokens } from '../../../../dist/src/tokenizer.js';

const root = dirname(fileURLToPath(import.meta.url));
const rerun = process.argv[2] && resolve(process.argv[2]);
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const sha = value => createHash('sha256').update(value).digest('hex');
const digest = value => sha(JSON.stringify(value));
const stable = ({ component_wall_ms, ...row }) => row;
const stableReport = report => ({ ...report, rows: report.rows.map(stable) });
const xml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const run = await json(join(root, 'run.json'));
const previous = await json(join(root, '../reference-followup/run.json'));
const { protocol } = run;
const fixturePath = 'packages/engine/src/evaluation/scope-contrast-cases.ts';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const modes = ['excerpts', 'rules_only'];
const reports = [
  ['results.json', 'summary.json', protocol.strategies],
  ['assertion-candidates.json', null, protocol.candidate.strategies],
  ['reference-candidates.json', null, protocol.reference_candidate.strategies],
];
const referenceStrategies = protocol.reference_candidate.strategies;

assert.notEqual(run.source_revision, run.fixture_revision);
git('merge-base', '--is-ancestor', run.fixture_revision, run.source_revision);
for (const revision of [run.fixture_revision, run.source_revision]) {
  assert.equal(git('rev-parse', `${revision}:${fixturePath}`), run.fixture_blob);
}
assert.equal(protocol.repeats, 2);
assert.deepEqual(protocol.cases, scopeContrastCases);
assert.deepEqual(protocol.documents, scopeContrastDocuments);
assert.equal(protocol.fixture_sha256, digest({ documents: scopeContrastDocuments, cases: scopeContrastCases }));
const evidence = await readFile(join(root, 'contrast.jsonl'), 'utf8');
assert.equal(sha(evidence), run.evidence_sha256);
const rows = evidence.trimEnd().split('\n').map(line => JSON.parse(line));
const byKey = new Map(rows.map(row => [`${row.mode}/${row.id}/${row.strategy}`, row]));
const strategies = reports.flatMap(([, , strategies]) => strategies);
assert.equal(rows.length, modes.length * scopeContrastCases.length * strategies.length);
assert.equal(byKey.size, rows.length);
const documents = new Map(scopeContrastDocuments.map(document => [document.name, document.text]));
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });

for (const mode of modes) for (const scenario of scopeContrastCases) for (const strategy of strategies) {
  const row = byKey.get(`${mode}/${scenario.id}/${strategy}`);
  assert.equal(row.repeat, 0);
  assert.equal(row.family, scenario.family);
  assert.deepEqual(row.expected_sources, scenario.sources);
  const actual = [...new Set(row.evidence.map(item => basename(item.source)))].sort();
  const missing = scenario.sources.filter(source => !actual.includes(source));
  const additional = actual.filter(source => !scenario.sources.includes(source));
  const missingSentences = scenario.sources.flatMap(source => [...segmenter.segment(documents.get(source))]
    .map(({ segment }) => segment.trim())
    .filter(sentence => !row.evidence.some(item => item.source === `s1/${source}` && item.quote.includes(sentence)))
    .map(sentence => ({ source, sentence })));
  for (const { source, quote } of row.evidence) {
    assert.equal(source, `s1/${basename(source)}`);
    assert(quote.trim() && documents.get(basename(source))?.includes(quote));
    const citation = `<citation source="${source}" at="lines 1-1"/>`;
    const evidenceXml = mode === 'excerpts' ? `<excerpt>${xml(quote)}${citation}</excerpt>`
      : `<text verbatim="true">${xml(quote)}</text>${citation}`;
    assert(row.text.includes(evidenceXml));
  }
  assert.equal((row.text.match(/<citation /g) ?? []).length, row.evidence.length);
  const tokens = countTokens(row.text, 'o200k_base');
  assert(tokens <= 500);
  assert.equal(Number(/ tokens="(\d+)"/.exec(row.text)?.[1]), tokens);
  assert.equal(row.citations_exact, true);
  assert.equal(row.cap_passed, true);
  assert.deepEqual(row.actual_sources, actual);
  assert.deepEqual(row.additional_sources, additional);
  assert.deepEqual(row.missing_sources, missing);
  assert.deepEqual(row.missing_sentences, missingSentences);
  assert.equal(row.correct, scenario.sources.length ? !missingSentences.length : !actual.length);
  assert.equal(row.precise_correct, row.correct && !additional.length);
  if (referenceStrategies.includes(strategy)) {
    const { terms, assertions, carried, replacement, focus_terms, admitted } = row;
    assert.deepEqual({ terms, assertions, carried, replacement, focus_terms, admitted },
      referenceAdmission(scenario.query, scopeContrastDocuments, strategy === 'reference-focus'));
    assert(row.prepack_sources.every(source => admitted.includes(source)));
  }
  if (row.prepack_sources) assert(actual.every(source => row.prepack_sources.includes(source)));
}

const pairScores = modes.flatMap(mode => strategies.map(strategy => {
  const passed = scopeContrasts.filter(({ id }) => [1, 2].every(index => byKey.get(`${mode}/${id}-${index}/${strategy}`).precise_correct));
  return { mode, strategy, passing_pairs: passed.map(({ id }) => id), total_pairs: scopeContrasts.length };
}));
assert.deepEqual(pairScores, run.pair_scores);

for (const [file, summary, selected] of reports) {
  const restored = [0, 1].flatMap(repeat => modes.flatMap(mode => {
    const cases = repeat ? [...scopeContrastCases].reverse() : scopeContrastCases;
    const order = [...selected.slice(repeat), ...selected.slice(0, repeat)];
    return cases.flatMap(({ id }) => order.map(strategy => ({ ...byKey.get(`${mode}/${id}/${strategy}`), repeat })));
  }));
  const scores = modes.flatMap(mode => selected.map(strategy => ({ mode, strategy,
    ...queryScopeScores(restored.filter(row => row.mode === mode && row.strategy === strategy)) })));
  assert.deepEqual(scores, run.reports[file].scores);
  assert.equal(digest(restored), run.reports[file].stable_rows_sha256);
  if (!rerun) continue;
  const fresh = await json(join(rerun, 'contrast', file));
  assert.deepEqual((summary ? fresh : fresh.rows).map(stable), restored);
  const freshSummary = summary ? await json(join(rerun, 'contrast', summary)) : { ...fresh, rows: undefined };
  assert.equal(digest(freshSummary), run.reports[file].summary_sha256);
}

assert.deepEqual(run.prior_corpora, Object.fromEntries(Object.entries(previous.corpora).map(([name, entry]) => [name, {
  baseline_rows: entry.baseline.rows,
  baseline_sha256: entry.baseline.stable_rows_sha256,
  summary_sha256: entry.baseline.summary_sha256,
  assertion_sha256: entry.assertion_sha256,
  reference_sha256: entry.reference_sha256,
}])));
if (rerun) {
  const freshProtocol = await json(join(rerun, 'contrast/protocol.json'));
  assert.deepEqual({ ...freshProtocol, recorded_at: protocol.recorded_at, node: protocol.node, platform: protocol.platform }, protocol);
  for (const [name, entry] of Object.entries(previous.corpora)) {
    const directory = join(rerun, name);
    const fresh = await json(join(directory, 'protocol.json'));
    assert.deepEqual(fresh, { ...entry.protocol, recorded_at: fresh.recorded_at, node: fresh.node, platform: fresh.platform,
      artifacts: { ...entry.protocol.artifacts, 'query-scope.js': protocol.artifacts['query-scope.js'] } });
    const baseline = await json(join(directory, 'results.json'));
    assert.equal(baseline.length, entry.baseline.rows);
    assert.equal(digest(baseline.map(stable)), entry.baseline.stable_rows_sha256);
    assert.equal(digest(await json(join(directory, 'summary.json'))), entry.baseline.summary_sha256);
    assert.equal(digest(stableReport(await json(join(directory, 'assertion-candidates.json')))), entry.assertion_sha256);
    assert.equal(digest(stableReport(await json(join(directory, 'reference-candidates.json')))), entry.reference_sha256);
  }
}
const checks = path => json(join(root, 'checks', path));
const [baselineParser, canary, fullAudit, productionAudit, latency] = await Promise.all([
  checks('parser-baseline.json'), checks('parser-canary.json'), checks('audit-full.json'),
  checks('audit-production.json'), checks('default-latency.json'),
]);
assert.equal(baselineParser.passed, 30);
assert.equal(baselineParser.total, 30);
assert.equal(canary.total, 30);
assert.equal(canary.passed, 28);
assert.deepEqual(canary.rows.filter(row => !row.passed).map(({ id, observed }) => [id, observed]),
  [['astral-one-question', 'typed'], ['astral-two-questions', 'unmatched']]);
assert.equal(fullAudit.metadata.vulnerabilities.moderate, 7);
assert.equal(fullAudit.metadata.vulnerabilities.total, 7);
assert.equal(productionAudit.metadata.vulnerabilities.total, 0);
assert.equal(latency.hook_deadline_ms, 2000);
assert.equal(latency.records.length, 24);
assert(latency.passed && latency.records.every(row => row.passed && row.delivery_passed && row.wall_ms < latency.hook_deadline_ms));
console.log(`Verified ${rows.length * 2} contrast rows, paired gates and verbatim evidence${rerun ? ', plus raw reruns and frozen corpus parity' : ''}.`);
