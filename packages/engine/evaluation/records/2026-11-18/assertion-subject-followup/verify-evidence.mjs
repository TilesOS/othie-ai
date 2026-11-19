import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const compiled = resolve(root, '../../../../dist/src');
const prior = resolve(root, '../../2026-11-14/term-ablation-followup');
const rerun = process.argv[2] && resolve(process.argv[2]);
const json = async (directory, path) => JSON.parse(await readFile(join(directory, path), 'utf8'));
const load = path => import(pathToFileURL(join(compiled, path)));
const hash = data => createHash('sha256').update(data).digest('hex');
const digest = value => hash(JSON.stringify(value));
const stable = ({ component_wall_ms, ...rest }) => rest;
const repeatStable = ({ repeat, ...rest }) => stable(rest);
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
const modes = ['excerpts', 'rules_only'];
const strategies = ['assertion-only', 'assertion-subject'];
const { countTokens } = await load('tokenizer.js');
const { assertionSubjectTerms, scopeAssertions } = await load('evaluation/assertion-subject.js');
const { meaningfulTerms } = await load('retrieval/terms.js');
const { applicabilityQualityCases } = await load('evaluation/quality-cases.js');
const { policyGuardCases } = await load('evaluation/policy-guard-cases.js');
const { localBindingCounterexamples } = await load('evaluation/local-bindings-cases.js');
const { clauseBindingCounterexamples } = await load('evaluation/clause-bindings-cases.js');
const { qualifiedBindingCounterexamples } = await load('evaluation/qualified-bindings-cases.js');
const parity = await json(root, 'baseline-parity.json');
const manifest = await json(root, 'manifest.json');
const priorManifest = await json(prior, 'manifest.json');
const published = (await readdir(root, { recursive: true, withFileTypes: true })).filter(entry => !entry.isDirectory());
assert(published.every(entry => entry.isFile()));
assert.deepEqual(published.map(entry => relative(root, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
  .filter(path => path !== 'manifest.json').sort(), manifest.files.map(entry => entry.path).sort());
for (const entry of manifest.files) {
  const bytes = await readFile(join(root, entry.path));
  assert.equal(hash(bytes), entry.sha256, entry.path);
  assert(!/\/Users\/|\/private\/var\/folders\//.test(bytes.toString('utf8')), entry.path);
}
async function priorJson(path) {
  const bytes = await readFile(join(prior, path));
  assert.equal(hash(bytes), priorManifest.files.find(entry => entry.path === path)?.sha256, path);
  return JSON.parse(bytes);
}

const escapeXml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&apos;');
function checkEvidence(row, fixture, texts) {
  const actual = [...new Set(row.evidence.map(item => basename(item.source)))].sort();
  const missing = fixture.sources.filter(source => !actual.includes(source));
  const additional = actual.filter(source => !fixture.sources.includes(source));
  const missingSentences = fixture.sources.flatMap(source => [...segmenter.segment(texts.get(source))]
    .map(({ segment }) => segment.trim())
    .filter(sentence => !row.evidence.some(item => item.source === `s1/${source}` && item.quote.includes(sentence)))
    .map(sentence => ({ source, sentence })));
  assert.deepEqual(row.actual_sources, actual);
  assert.deepEqual(row.expected_sources, fixture.sources);
  assert.deepEqual(row.missing_sources, missing);
  assert.deepEqual(row.additional_sources, additional);
  assert.deepEqual(row.missing_sentences, missingSentences);
  for (const { quote, source } of row.evidence) {
    assert.equal(source, `s1/${basename(source)}`);
    assert(quote.trim() && texts.get(basename(source))?.includes(quote));
    const citation = `<citation source="${source}" at="lines 1-1"/>`;
    const content = row.mode === 'rules_only'
      ? `<text verbatim="true">${escapeXml(quote)}</text>`
      : `<excerpt>${escapeXml(quote)}`;
    assert(row.text.includes(content + citation));
  }
  assert.equal((row.text.match(/<citation /g) ?? []).length, row.evidence.length);
  const tokens = countTokens(row.text, 'o200k_base');
  assert(tokens <= 500);
  assert.equal(Number(/ tokens="(\d+)"/.exec(row.text)?.[1]), tokens);
  assert.equal(row.citations_exact, true);
  assert.equal(row.cap_passed, true);
  const correct = fixture.sources.length ? !missingSentences.length && !missing.length : !actual.length;
  assert.equal(row.correct, correct, row.id);
  assert.equal(row.precise_correct, correct && !additional.length, row.id);
}

function scores(rows) {
  return modes.flatMap(mode => strategies.map(strategy => {
    const group = rows.filter(row => row.mode === mode && row.strategy === strategy);
    const positives = group.filter(row => row.expected_sources.length);
    const noOps = group.filter(row => !row.expected_sources.length);
    const count = (items, key = 'correct') => ({ correct: items.filter(row => row[key]).length, total: items.length });
    const memberships = positives.flatMap(row => row.actual_sources.map(source => row.expected_sources.includes(source)));
    const gates = { positive_recall: positives.every(row => row.correct), positive_exact: positives.every(row => row.precise_correct),
      no_op: noOps.every(row => row.correct), citations_exact: group.every(row => row.citations_exact), token_caps: group.every(row => row.cap_passed) };
    return { mode, strategy, positive: count(positives), no_op: count(noOps), combined: count(group),
      positive_exact: count(positives, 'precise_correct'),
      positive_with_additional_sources: { count: positives.filter(row => row.additional_sources.length).length, total: positives.length },
      positive_source_precision: { relevant: memberships.filter(Boolean).length, retrieved: memberships.length },
      citations_exact: gates.citations_exact, caps_passed: gates.token_caps,
      gates: { ...gates, accepted: group.length > 0 && Object.values(gates).every(Boolean) } };
  }));
}

let total = 0;
for (const name of ['historical', 'transfer']) {
  const protocol = await json(root, `${name}/protocol.json`);
  const frozen = await priorJson(`${name}/protocol.json`);
  for (const key of ['cases', 'documents', 'strategies', 'fixture_sha256', 'corpus', 'scoring', 'repeats']) {
    assert.deepEqual(protocol[key], frozen[key], key);
  }
  assert.equal(protocol.candidate.protocol, 'scope-assertion-subject-v1');
  assert.deepEqual(protocol.candidate.strategies, strategies);
  const baseline = await priorJson(`${name}/results.json`);
  const baselineSummary = await priorJson(`${name}/summary.json`);
  assert.deepEqual(parity[name], { rows: baseline.length, stable_rows_sha256: digest(baseline.map(stable)),
    summary_sha256: digest(baselineSummary), exit: 1 });
  for (const [path, expected] of Object.entries(frozen.artifacts)) {
    if (path !== 'query-scope.js') assert.equal(protocol.artifacts[path], expected, path);
  }
  for (const [path, expected] of Object.entries(protocol.artifacts)) {
    assert.equal(hash(await readFile(resolve(compiled, 'evaluation', path))), expected, path);
  }
  const report = await json(root, `${name}/assertion-candidates.json`);
  assert.equal(report.protocol, protocol.candidate.protocol);
  if (rerun) {
    assert.deepEqual((await json(join(rerun, name), 'results.json')).map(stable), baseline.map(stable));
    assert.deepEqual(await json(join(rerun, name), 'summary.json'), baselineSummary);
    const fresh = await json(join(rerun, name), 'assertion-candidates.json');
    assert.deepEqual({ ...fresh, rows: fresh.rows.map(stable) }, { ...report, rows: report.rows.map(stable) });
  }
  const texts = new Map(protocol.documents.map(document => [document.name, document.text]));
  const previous = new Map(baseline.filter(row => row.strategy === 'qualified-bindings')
    .map(row => [`${row.repeat}/${row.mode}/${row.id}`, row]));
  const onFirstRepeat = new Map();
  let index = 0;
  for (let repeat = 0; repeat < 2; repeat++) for (const mode of modes) {
    for (const fixture of repeat ? [...protocol.cases].reverse() : protocol.cases) {
      for (const strategy of repeat ? [...strategies].reverse() : strategies) {
        const row = report.rows[index++];
        assert.deepEqual([row.id, row.mode, row.repeat, row.strategy, row.family], [fixture.id, mode, repeat, strategy, fixture.family]);
        const key = `${mode}/${fixture.id}`;
        const baselineRow = previous.get(`${repeat}/${key}`);
        assert.deepEqual(row.terms, strategy === 'assertion-only' ? baselineRow.terms : assertionSubjectTerms(fixture.query));
        assert.equal(row.query, row.terms.join(' ') || '?');
        assert.deepEqual(row.assertions, scopeAssertions(row.terms, protocol.documents));
        assert(row.prepack_sources.every(source => row.assertions.some(item => item.source === source && item.asserted_terms.length)));
        assert(row.actual_sources.every(source => row.prepack_sources.includes(source)));
        checkEvidence(row, fixture, texts);
        if (baselineRow.correct) assert(row.correct, `Regression from qualified bindings for ${fixture.id}`);
        if (baselineRow.precise_correct) assert(row.precise_correct, `Exact evidence regression for ${fixture.id}`);
        const repeatKey = `${strategy}/${key}`;
        if (repeat) assert.deepEqual(repeatStable(row), onFirstRepeat.get(repeatKey));
        else onFirstRepeat.set(repeatKey, repeatStable(row));
      }
    }
  }
  assert.equal(index, report.rows.length);
  assert.deepEqual(report.scores, scores(report.rows));
  assert(report.scores.every(score => !score.gates.accepted));
  const caseIds = items => new Set(items.map(({ id }) => id));
  const original = new Set(protocol.original_case_ids);
  const groups = name === 'transfer' ? { transfer: caseIds(protocol.cases) } : {
    original, policy_guard: caseIds(policyGuardCases.filter(item => !original.has(item.id))),
    local_bindings: caseIds(localBindingCounterexamples), clause_bindings: caseIds(clauseBindingCounterexamples),
    qualified_bindings: caseIds(qualifiedBindingCounterexamples),
  };
  assert.deepEqual(report.subsets, Object.fromEntries(Object.entries(groups).map(([group, ids]) => [group,
    scores(report.rows.filter(row => ids.has(row.id)))])));
  assert.deepEqual(report.previous_applicability_query_terms.find(item => item.strategy === 'assertion-only'),
    baselineSummary.previous_applicability_query_terms.filter(item => item.strategy === 'qualified-bindings')
      .map(item => ({ ...item, strategy: 'assertion-only' }))[0]);
  assert.deepEqual(report.previous_applicability_query_terms[1], { strategy: 'assertion-subject', total: applicabilityQualityCases.length,
    unchanged: applicabilityQualityCases.filter(({ query }) => digest(meaningfulTerms(query)) === digest(assertionSubjectTerms(query))).length });
  total += report.rows.length;
}
assert.equal(total, 960);
const tests = await readFile(join(root, 'checks/test.txt'), 'utf8');
assert.equal([...tests.matchAll(/Tests\s+(\d+) passed/g)].reduce((sum, match) => sum + Number(match[1]), 0), 318);
assert.equal([...tests.matchAll(/Tests\s+\d+ passed \| (\d+) skipped/g)].reduce((sum, match) => sum + Number(match[1]), 0), 1);
for (const [file, expected] of Object.entries({ 'audit-before': 8, 'audit-after': 7, 'audit-production-before': 1, 'audit-production-after': 0 })) {
  assert.equal((await json(root, `checks/${file}.json`)).metadata.vulnerabilities.total, expected);
}
const parser = await json(root, 'checks/upstream-parser.json');
assert.equal(parser.minimatch, '11.0.9');
assert.equal(parser.typescript, '6.0.3');
assert.deepEqual(parser.rows.filter(row => !row.passed).map(row => [row.id, row.expected, row.observed]), [
  ['astral-one-question', 'unmatched', 'typed'],
  ['astral-two-questions', 'typed', 'unmatched'],
]);
assert.equal(parser.rows.filter(row => row.passed).length, 28);
assert.equal(parser.rows.length, 30);
const ci = await json(root, 'checks/ci-4db79b5.json');
assert.equal(ci.headSha, '4db79b52e886d63e33ebbcedf213a8e749e803c9');
const windows = ci.jobs.find(job => job.name === 'desktop (windows-latest)');
assert.equal(windows.conclusion, 'success');
for (const name of ['Run npm ci', 'Run npm run typecheck', 'Run npm run lint --workspace=@othie/website',
  'Run npm test', 'Check Windows startup script syntax']) {
  assert.equal(windows.steps.find(step => step.name === name)?.conclusion, 'success');
}
const mac = ci.jobs.find(job => job.name === 'desktop (macos-14)');
assert.equal(mac.conclusion, 'cancelled');
assert.deepEqual(mac.steps, []);
assert((await json(root, 'checks/macos-annotations.json')).some(annotation =>
  annotation.message.includes("'macos-14-arm64-us-default' is not supported")));
console.log(`Verified ${total} candidate rows, evidence and gates, 3,360 baseline row commitments, and local, audit, and CI records.`);
