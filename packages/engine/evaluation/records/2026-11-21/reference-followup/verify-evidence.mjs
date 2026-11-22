import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '../../../../../..');
const compiled = resolve(root, '../../../../dist/src');
const prior = resolve(root, '../../2026-11-18/assertion-subject-followup');
const rerun = process.argv[2] && resolve(process.argv[2]);
const json = async (directory, path) => JSON.parse(await readFile(join(directory, path), 'utf8'));
const load = path => import(pathToFileURL(join(compiled, path)));
const sha = data => createHash('sha256').update(data).digest('hex');
const digest = data => sha(JSON.stringify(data));
const stable = ({ component_wall_ms, ...row }) => row;
const stableReport = report => ({ ...report, rows: report.rows.map(stable) });
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
const modes = ['excerpts', 'rules_only'];
const count = (rows, key = 'correct') => ({ correct: rows.filter(row => row[key]).length, total: rows.length });
const { countTokens } = await load('tokenizer.js');
const { referenceAdmission, referenceTerms } = await load('evaluation/scope-reference.js');
const { applicabilityQualityCases } = await load('evaluation/quality-cases.js');
const { meaningfulTerms } = await load('retrieval/terms.js');
const { scopeReferenceCases, scopeReferenceDocuments } = await load('evaluation/scope-reference-cases.js');
const { policyGuardCases } = await load('evaluation/policy-guard-cases.js');
const { localBindingCounterexamples } = await load('evaluation/local-bindings-cases.js');
const { clauseBindingCounterexamples } = await load('evaluation/clause-bindings-cases.js');
const { qualifiedBindingCounterexamples } = await load('evaluation/qualified-bindings-cases.js');
const run = await json(root, 'run.json');
const fixturePath = 'packages/engine/src/evaluation/scope-reference-cases.ts';
const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
assert.equal(git('rev-parse', `${run.fixture_revision}:${fixturePath}`), run.fixture_blob);
assert.equal(git('rev-parse', `${run.source_revision}:${fixturePath}`), run.fixture_blob);
assert.notEqual(run.fixture_revision, run.source_revision);
git('merge-base', '--is-ancestor', run.fixture_revision, run.source_revision);
const parity = await json(prior, 'baseline-parity.json');

const xml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&apos;');

function checkEvidence(row, fixture, documents) {
  assert.deepEqual(row.expected_sources, fixture.sources);
  const actual = [...new Set(row.evidence.map(({ source }) => basename(source)))].sort();
  const missing = fixture.sources.filter(source => !actual.includes(source));
  const additional = actual.filter(source => !fixture.sources.includes(source));
  const missingSentences = fixture.sources.flatMap(source => [...segmenter.segment(documents.get(source))]
    .map(({ segment }) => segment.trim())
    .filter(sentence => !row.evidence.some(item => item.source === `s1/${source}` && item.quote.includes(sentence)))
    .map(sentence => ({ source, sentence })));
  assert.deepEqual(row.actual_sources, actual);
  assert.deepEqual(row.missing_sources, missing);
  assert.deepEqual(row.additional_sources, additional);
  assert.deepEqual(row.missing_sentences, missingSentences);
  for (const { quote, source } of row.evidence) {
    assert.equal(source, `s1/${basename(source)}`);
    assert(quote.trim() && documents.get(basename(source))?.includes(quote));
    const citation = `<citation source="${source}" at="lines 1-1"/>`;
    const content = row.mode === 'rules_only' ? `<text verbatim="true">${xml(quote)}</text>${citation}` : `<excerpt>${xml(quote)}${citation}</excerpt>`;
    assert(row.text.includes(content), `${row.mode}/${row.id}/${source}`);
  }
  assert.equal((row.text.match(/<citation /g) ?? []).length, row.evidence.length);
  const tokens = countTokens(row.text, 'o200k_base');
  assert(tokens <= 500);
  assert.equal(Number(/ tokens="(\d+)"/.exec(row.text)?.[1]), tokens);
  assert.equal(row.cap_passed, true);
  assert.equal(row.citations_exact, true);
  const correct = fixture.sources.length ? !missing.length && !missingSentences.length : !actual.length;
  assert.equal(row.correct, correct, row.id);
  assert.equal(row.precise_correct, correct && !additional.length, row.id);
}

function scores(rows, strategies) {
  return modes.flatMap(mode => strategies.map(strategy => {
    const selected = rows.filter(row => row.mode === mode && row.strategy === strategy);
    const positive = selected.filter(row => row.expected_sources.length);
    const noOp = selected.filter(row => !row.expected_sources.length);
    const memberships = positive.flatMap(row => row.actual_sources.map(source => row.expected_sources.includes(source)));
    const gates = { positive_recall: positive.every(row => row.correct), positive_exact: positive.every(row => row.precise_correct),
      no_op: noOp.every(row => row.correct), citations_exact: selected.every(row => row.citations_exact), token_caps: selected.every(row => row.cap_passed) };
    return { mode, strategy, positive: count(positive), no_op: count(noOp), combined: count(selected), positive_exact: count(positive, 'precise_correct'),
      positive_with_additional_sources: { count: positive.filter(row => row.additional_sources.length).length, total: positive.length },
      positive_source_precision: { relevant: memberships.filter(Boolean).length, retrieved: memberships.length },
      citations_exact: gates.citations_exact, caps_passed: gates.token_caps,
      gates: { ...gates, accepted: selected.length > 0 && Object.values(gates).every(Boolean) } };
  }));
}

function restoreRepeats(first, protocol, strategies) {
  const byKey = new Map(first.map(row => [`${row.mode}/${row.id}/${row.strategy}`, row]));
  assert.equal(first.length, protocol.cases.length * modes.length * strategies.length);
  return [0, 1].flatMap(repeat => modes.flatMap(mode => (repeat ? [...protocol.cases].reverse() : protocol.cases)
    .flatMap(fixture => (repeat ? [...strategies].reverse() : strategies).map(strategy => {
      const row = byKey.get(`${mode}/${fixture.id}/${strategy}`);
      assert.equal(row.repeat, 0);
      assert.equal(row.family, fixture.family);
      return { ...row, repeat };
    }))));
}

let total = 0;
for (const [name, entry] of Object.entries(run.corpora)) {
  const { protocol } = entry;
  assert.equal(protocol.repeats, 2);
  assert.equal(protocol.fixture_sha256, digest({ documents: protocol.documents, cases: protocol.cases }));
  for (const [path, expected] of Object.entries(protocol.artifacts)) assert.equal(sha(await readFile(resolve(compiled, 'evaluation', path))), expected, path);
  const bytes = await readFile(join(root, `${name}.jsonl`), 'utf8');
  assert(!/\/Users\/|\/private\/var\/folders\//.test(bytes));
  assert.equal(sha(bytes), entry.evidence_sha256);
  const published = bytes.trimEnd().split('\n').map(line => JSON.parse(line));
  const assertionStrategies = protocol.candidate.strategies;
  const referenceStrategies = protocol.reference_candidate.strategies;
  const fixtures = new Map(protocol.cases.map(fixture => [fixture.id, fixture]));
  const documents = new Map(protocol.documents.map(document => [document.name, document.text]));
  for (const row of published) {
    const fixture = fixtures.get(row.id);
    checkEvidence(row, fixture, documents);
    const { terms, assertions, admitted, carried, replacement, focus_terms } = row;
    if (referenceStrategies.includes(row.strategy)) {
      assert.deepEqual({ terms, assertions, admitted, carried, replacement, focus_terms },
        referenceAdmission(fixture.query, protocol.documents, row.strategy === 'reference-focus'));
      assert(row.prepack_sources.every(source => admitted.includes(source)));
    }
    assert(row.actual_sources.every(source => row.prepack_sources.includes(source)));
    assert.equal(row.query, terms.join(' ') || '?');
  }
  const referenceRows = restoreRepeats(published.filter(row => referenceStrategies.includes(row.strategy)), protocol, referenceStrategies);
  const reference = { protocol: entry.reference_summary.protocol, rows: referenceRows,
    scores: entry.reference_summary.scores, subsets: entry.reference_summary.subsets,
    previous_applicability_query_terms: entry.reference_summary.previous_applicability_query_terms };
  assert.equal(digest(reference), entry.reference_sha256);
  assert.deepEqual(reference.scores, scores(referenceRows, referenceStrategies));
  assert.deepEqual(reference.previous_applicability_query_terms, { total: applicabilityQualityCases.length,
    unchanged: applicabilityQualityCases.filter(({ query }) => digest(referenceTerms(query).terms) === digest(meaningfulTerms(query))).length });
  total += referenceRows.length;
  let assertion;
  if (name === 'reference') {
    assert.deepEqual(protocol.cases, scopeReferenceCases);
    assert.deepEqual(protocol.documents, scopeReferenceDocuments);
    const assertionRows = restoreRepeats(published.filter(row => assertionStrategies.includes(row.strategy)), protocol, assertionStrategies);
    assertion = { protocol: entry.assertion_summary.protocol, rows: assertionRows, scores: entry.assertion_summary.scores,
      subsets: entry.assertion_summary.subsets, previous_applicability_query_terms: entry.assertion_summary.previous_applicability_query_terms };
    assert.deepEqual(assertion.scores, scores(assertionRows, assertionStrategies));
    assert.deepEqual(assertion.subsets.reference, assertion.scores);
    assert.deepEqual(reference.subsets.reference, reference.scores);
    assert.equal(digest(entry.baseline_summary), entry.baseline.summary_sha256);
  } else {
    assert.deepEqual(entry.baseline, parity[name]);
    const older = await json(prior, `${name}/protocol.json`);
    for (const key of ['cases', 'documents', 'strategies', 'fixture_sha256', 'scoring', 'repeats']) assert.deepEqual(protocol[key], older[key]);
    for (const [path, expected] of Object.entries(older.artifacts)) if (path !== 'query-scope.js') assert.equal(protocol.artifacts[path], expected, path);
    assertion = stableReport(await json(prior, `${name}/assertion-candidates.json`));
    const caseIds = cases => cases.map(({ id }) => id);
    const groups = name === 'transfer' ? { transfer: caseIds(protocol.cases) } : {
      original: protocol.original_case_ids,
      policy_guard: caseIds(policyGuardCases).filter(id => !protocol.original_case_ids.includes(id)),
      local_bindings: caseIds(localBindingCounterexamples), clause_bindings: caseIds(clauseBindingCounterexamples),
      qualified_bindings: caseIds(qualifiedBindingCounterexamples),
    };
    assert.deepEqual(reference.subsets, Object.fromEntries(Object.entries(groups).map(([subset, ids]) =>
      [subset, scores(referenceRows.filter(row => ids.includes(row.id)), referenceStrategies)])));
  }
  assert.equal(digest(assertion), entry.assertion_sha256);
  const previous = new Map(assertion.rows.filter(row => row.strategy === 'assertion-subject')
    .map(row => [`${row.mode}/${row.repeat}/${row.id}`, row]));
  for (const row of referenceRows) {
    const before = previous.get(`${row.mode}/${row.repeat}/${row.id}`);
    if (before.correct) assert(row.correct, row.id);
    if (before.precise_correct) assert(row.precise_correct, row.id);
  }
  if (rerun) {
    const path = join(rerun, name);
    const fresh = await json(path, 'protocol.json');
    assert.deepEqual({ ...fresh, recorded_at: protocol.recorded_at, node: protocol.node, platform: protocol.platform }, protocol);
    const baseline = await json(path, 'results.json');
    assert.equal(baseline.length, entry.baseline.rows);
    assert.equal(digest(baseline.map(stable)), entry.baseline.stable_rows_sha256);
    assert.equal(digest(await json(path, 'summary.json')), entry.baseline.summary_sha256);
    assert.deepEqual(stableReport(await json(path, 'assertion-candidates.json')), assertion);
    assert.deepEqual(stableReport(await json(path, 'reference-candidates.json')), reference);
  }
}

const ci = await json(root, 'checks/ci-45ae572.json');
assert.equal(ci.headSha, '45ae57261ab80a53e73d2221c692eb87e97ba5ee');
assert.equal(ci.conclusion, 'success');
assert.deepEqual(ci.jobs.map(job => job.name).sort(), ['desktop (macos-15)', 'desktop (windows-latest)']);
for (const job of ci.jobs) {
  assert.equal(job.conclusion, 'success');
  for (const name of ['Run npm ci', 'Run npm run typecheck', 'Run npm run lint --workspace=@othie/website', 'Run npm test']) {
    assert.equal(job.steps.find(step => step.name === name)?.conclusion, 'success');
  }
  assert.equal(job.steps.find(step => step.name === 'Check Windows startup script syntax')?.conclusion,
    job.name.includes('windows') ? 'success' : 'skipped');
}
const full = await json(root, 'checks/audit-full.json');
const prod = await json(root, 'checks/audit-production.json');
assert.equal(full.metadata.vulnerabilities.moderate, 7);
assert.equal(full.metadata.vulnerabilities.total, 7);
assert.equal(prod.metadata.vulnerabilities.total, 0);
console.log(`Verified ${total} reference candidate rows, evidence and gates, prior parity, published CI and audits.`);
