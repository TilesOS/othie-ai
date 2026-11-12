import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '../../../../../..');
const compiled = join(repository, 'packages/engine/dist/src');
const hash = data => createHash('sha256').update(data).digest('hex');
const json = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
async function filesAt(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    assert(!entry.isSymbolicLink(), 'Evidence must not contain symlinks');
    if (entry.isDirectory()) files.push(...await filesAt(path));
    else { assert(entry.isFile()); files.push(relative(root, path).replaceAll('\\', '/')); }
  }
  return files.sort();
}
const manifest = await json('manifest.json');
const files = (await filesAt(root)).filter(path => path !== 'manifest.json');
assert.deepEqual(files, manifest.files.map(item => item.path).sort());
for (const item of manifest.files) {
  const bytes = await readFile(join(root, item.path));
  assert.equal(bytes.length, item.bytes, item.path);
  assert.equal(hash(bytes), item.sha256, item.path);
  if (/\.(?:json|txt|md)$/.test(item.path)) assert(!/\/Users\/|\/private\/var\/folders\/|account_rate_limits|access_token|refresh_token/.test(bytes.toString('utf8')), `Private metadata in ${item.path}`);
}
const publication = await json('publication.json');
for (const item of publication.files) assert.equal(hash(await readFile(join(root, item.path))), item.published_sha256);

const { queryScopeCases: originalCases, queryScopeDocuments } = await import(pathToFileURL(join(compiled, 'evaluation/query-scope-cases.js')));
const { queryScopeTerms, qualifiedBindingStrategies: queryScopeStrategies } = await import(pathToFileURL(join(compiled, 'evaluation/query-scope.js')));
const { localBindingCases, localBindingCounterexamples } = await import(pathToFileURL(join(compiled, 'evaluation/local-bindings-cases.js')));
const { clauseBindingCases, clauseBindingCounterexamples } = await import(pathToFileURL(join(compiled, 'evaluation/clause-bindings-cases.js')));
const { qualifiedBindingCases: queryScopeCases, qualifiedBindingCounterexamples } = await import(pathToFileURL(join(compiled, 'evaluation/qualified-bindings-cases.js')));
const { policyGuardCases } = await import(pathToFileURL(join(compiled, 'evaluation/policy-guard-cases.js')));
const { countTokens } = await import(pathToFileURL(join(compiled, 'tokenizer.js')));
const { applicabilityQualityCases } = await import(pathToFileURL(join(compiled, 'evaluation/quality-cases.js')));
const protocol = await json('final/protocol.json');
assert.equal(protocol.protocol, 'query-scope-shadow-v3');
assert.equal(protocol.corpus, 'qualified-bindings');
assert.deepEqual(queryScopeCases.slice(0, 74), clauseBindingCases);
assert.deepEqual(clauseBindingCases.slice(0, 57), localBindingCases);
assert.equal(qualifiedBindingCounterexamples.length, 16);
assert.deepEqual(localBindingCases.slice(0, 45), policyGuardCases);
assert.equal(clauseBindingCounterexamples.length, 17);
assert.equal(localBindingCounterexamples.length, 12);
assert.equal(protocol.repeats, 2);
assert.deepEqual(protocol.strategies, queryScopeStrategies);
assert.deepEqual(protocol.original_case_ids, originalCases.map(item => item.id));
assert.deepEqual(protocol.documents, queryScopeDocuments);
assert.deepEqual(protocol.cases, queryScopeCases);
assert.equal(protocol.fixture_sha256, hash(JSON.stringify({ documents: queryScopeDocuments, cases: queryScopeCases })));
for (const [name, expected] of Object.entries(protocol.artifacts)) assert.equal(hash(await readFile(resolve(compiled, 'evaluation', name))), expected, `Rebuild changed ${name}`);
const results = await json('final/results.json');
const summary = await json('final/summary.json');
assert.equal(summary.completed, true);
assert.equal(summary.all_correct, false);
assert.equal(summary.all_precise_correct, false);
assert.equal(results.length, protocol.repeats * 2 * queryScopeCases.length * queryScopeStrategies.length);
assert.equal(summary.rows, results.length);
assert.deepEqual(JSON.parse(await readFile(join(root, 'checks/scope.txt'), 'utf8')), summary);
const cases = new Map(protocol.cases.map(item => [item.id, item]));
const documents = new Map(protocol.documents.map(item => [item.name, item.text]));
const escapeXml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const independent = [];
const keys = new Set();
for (const row of results) {
  const key = JSON.stringify([row.id, row.mode, row.strategy, row.repeat]);
  assert(!keys.has(key)); keys.add(key);
  const scenario = cases.get(row.id); assert(scenario);
  assert.deepEqual(row.expected_sources, scenario.sources);
  assert.equal(row.family, scenario.family);
  assert.deepEqual(row.terms, queryScopeTerms(scenario.query, row.strategy));
  assert.equal(row.query, row.strategy === 'lexical' ? scenario.query : row.terms.join(' ') || '?');
  const sources = [...new Set(row.evidence.map(item => basename(item.source)))].sort();
  const missingSources = scenario.sources.filter(source => !sources.includes(source));
  const missingSentences = [];
  for (const source of scenario.sources) {
    const quotes = row.evidence.filter(item => basename(item.source) === source).map(item => item.quote);
    for (const { segment } of new Intl.Segmenter('en', { granularity: 'sentence' }).segment(documents.get(source))) {
      const sentence = segment.trim();
      if (!quotes.some(quote => quote.includes(sentence))) missingSentences.push({ source, sentence });
    }
  }
  assert.deepEqual(row.actual_sources, sources);
  assert.deepEqual(row.missing_sources, missingSources);
  assert.deepEqual(row.missing_sentences, missingSentences);
  assert.deepEqual(row.additional_sources, sources.filter(source => !scenario.sources.includes(source)));
  for (const item of row.evidence) {
    assert.equal(item.source, `s1/${basename(item.source)}`);
    assert(item.quote.trim());
    assert(documents.get(basename(item.source))?.includes(item.quote));
    assert(row.text.includes(escapeXml(item.quote)));
    assert(row.text.includes(`<citation source="${item.source}" at="lines 1-1"/>`));
  }
  assert.equal(row.citations_exact, true);
  assert.equal(row.cap_passed, true);
  const tokens = countTokens(row.text, 'o200k_base');
  assert(tokens <= 500);
  assert.equal(Number(/ tokens="(\d+)"/.exec(row.text)?.[1]), tokens);
  assert.equal((row.text.match(/<citation /g) ?? []).length, row.evidence.length);
  assert.equal(row.correct, scenario.sources.length ? missingSources.length === 0 && missingSentences.length === 0 : row.evidence.length === 0);
  assert(Number.isFinite(row.component_wall_ms) && row.component_wall_ms >= 0);
  const correct = scenario.sources.length ? missingSources.length === 0 && missingSentences.length === 0 : row.evidence.length === 0;
  const precise = correct && sources.every(source => scenario.sources.includes(source));
  assert.equal(row.precise_correct, precise);
  independent.push({ ...row, actual_sources: sources, correct, precise_correct: precise });
}
const expectedOrder = [];
for (let repeat = 0; repeat < protocol.repeats; repeat++) for (const mode of ['excerpts', 'rules_only']) {
  const ordered = repeat % 2 ? [...protocol.cases].reverse() : protocol.cases;
  for (const scenario of ordered) for (let offset = 0; offset < queryScopeStrategies.length; offset++) expectedOrder.push([scenario.id, mode, queryScopeStrategies[(offset + repeat) % queryScopeStrategies.length], repeat]);
}
assert.deepEqual(results.map(row => [row.id, row.mode, row.strategy, row.repeat]), expectedOrder);
const count = rows => ({ correct: rows.filter(row => row.correct).length, total: rows.length });
const scoresFor = subset => ['excerpts', 'rules_only'].flatMap(mode => queryScopeStrategies.map(strategy => {
  const rows = subset.filter(row => row.mode === mode && row.strategy === strategy);
  const positives = rows.filter(row => row.expected_sources.length);
  const noOps = rows.filter(row => !row.expected_sources.length);
  const positiveExact = { correct: positives.filter(row => row.precise_correct).length, total: positives.length };
  let relevant = 0, retrieved = 0;
  for (const row of positives) for (const source of new Set(row.actual_sources)) {
    retrieved++;
    if (row.expected_sources.includes(source)) relevant++;
  }
  const gates = { positive_recall: positives.every(row => row.correct), positive_exact: positives.every(row => row.precise_correct),
    no_op: noOps.every(row => row.correct), citations_exact: rows.every(row => row.citations_exact), token_caps: rows.every(row => row.cap_passed) };
  return { mode, strategy, positive: count(positives), no_op: count(noOps), combined: count(rows), positive_exact: positiveExact,
    positive_with_additional_sources: { count: positives.filter(row => row.actual_sources.some(source => !row.expected_sources.includes(source))).length, total: positives.length },
    positive_source_precision: { relevant, retrieved }, citations_exact: true, caps_passed: true,
    gates: { ...gates, accepted: rows.length > 0 && Object.values(gates).every(Boolean) } };
}));
assert.deepEqual(summary.scores, scoresFor(independent));
const originalIds = new Set(originalCases.map(item => item.id));
assert.deepEqual(summary.subsets, {
  original: scoresFor(independent.filter(row => originalIds.has(row.id))),
  counterexamples: scoresFor(independent.filter(row => !originalIds.has(row.id))),
});
for (const row of results.filter(item => item.repeat > 0)) {
  const first = results.find(item => item.repeat === 0 && item.id === row.id && item.mode === row.mode && item.strategy === row.strategy);
  for (const field of ['correct', 'evidence', 'missing_sources', 'missing_sentences']) assert.deepEqual(row[field], first[field]);
}
assert.deepEqual(summary.previous_applicability_query_terms, queryScopeStrategies.map(strategy => ({ strategy, total: applicabilityQualityCases.length,
  unchanged: applicabilityQualityCases.filter(item => JSON.stringify(queryScopeTerms(item.query, strategy)) === JSON.stringify(queryScopeTerms(item.query, 'lexical'))).length })));

// Every prior qualified-binding row must retain the same terms, evidence and judgments.
// Verify the archived bytes against their own manifest, rather than demanding
// that today's extended evaluator have the old compiled artifact hash.
const priorRoot = resolve(root, '../../2026-11-10/qualified-bindings-followup');
const priorManifest = JSON.parse(await readFile(join(priorRoot, 'manifest.json'), 'utf8'));
const priorJson = async name => {
  const bytes = await readFile(join(priorRoot, name));
  assert.equal(hash(bytes), priorManifest.files.find(item => item.path === name).sha256);
  return JSON.parse(bytes);
};
const priorProtocol = await priorJson('final/protocol.json');
assert.deepEqual(priorProtocol.cases, queryScopeCases);
assert.deepEqual(priorProtocol.documents, protocol.documents);
assert.equal(protocol.fixture_sha256, priorProtocol.fixture_sha256);
const paired = await priorJson('final/results.json');
assert.equal(paired.length, 2520);
for (const prior of paired) {
  const current = results.find(row => row.id === prior.id && row.mode === prior.mode && row.strategy === prior.strategy && row.repeat === prior.repeat);
  assert(current);
  for (const field of ['query', 'terms', 'correct', 'evidence', 'text', 'actual_sources', 'missing_sources', 'missing_sentences', 'additional_sources', 'citations_exact', 'cap_passed']) assert.deepEqual(current[field], prior[field], `${prior.id}: ${field}`);
}
const priorSummary = await priorJson('final/summary.json');
const historical = score => Object.fromEntries(['mode', 'strategy', 'positive', 'no_op', 'combined', 'citations_exact', 'caps_passed'].map(key => [key, score[key]]));
for (const key of ['scores', 'policy_guard', 'local_bindings', 'clause_bindings', 'qualified_bindings']) assert.deepEqual(summary[key].map(historical), priorSummary[key]);
for (const key of ['original', 'counterexamples']) assert.deepEqual(summary.subsets[key].map(historical), priorSummary.subsets[key]);
const guardIds = new Set(policyGuardCases.filter(row => !originalIds.has(row.id)).map(row => row.id));
const bindingIds = new Set(localBindingCounterexamples.map(row => row.id));
const clauseIds = new Set(clauseBindingCounterexamples.map(row => row.id));
const qualifiedIds = new Set(qualifiedBindingCounterexamples.map(row => row.id));
for (const [name, ids] of [['policy_guard', guardIds], ['local_bindings', bindingIds], ['clause_bindings', clauseIds], ['qualified_bindings', qualifiedIds]]) assert.deepEqual(summary[name], scoresFor(independent.filter(row => ids.has(row.id))));
const expected = {
  lexical: [98, 4], 'drop-request': [96, 46], 'mask-call-arguments': [44, 42],
  'policy-guarded-arguments': [60, 26], 'local-bindings': [64, 60], 'clause-bindings': [82, 60], 'qualified-bindings': [94, 68],
};
for (const mode of ['excerpts', 'rules_only']) {
  for (const strategy of queryScopeStrategies) {
    const candidate = summary.scores.find(row => row.mode === mode && row.strategy === strategy);
    assert.deepEqual(candidate.positive, { correct: expected[strategy][0], total: 98 });
    assert.deepEqual(candidate.no_op, { correct: expected[strategy][1], total: 82 });
  }
  const row = (id, strategy = 'qualified-bindings') => results.find(item => item.id === id && item.mode === mode && item.strategy === strategy && item.repeat === 0);
  for (const id of ['clause-trailing-isolated', 'clause-negated-only', 'clause-negated-policy-same', 'clause-adverb-negation']) {
    assert.equal(row(id).correct, true);
    assert.equal(row(id, 'clause-bindings').correct, false);
  }
  for (const id of ['qualified-trailing-required', 'qualified-distant-antecedent', 'qualified-local-followup']) assert.equal(row(id).correct, false);
  const priorIds = new Set(clauseBindingCases.map(item => item.id));
  const priorRows = results.filter(item => item.mode === mode && item.strategy === 'qualified-bindings' && priorIds.has(item.id));
  assert.deepEqual(count(priorRows.filter(item => item.expected_sources.length)), { correct: 82, total: 82 });
  assert.deepEqual(count(priorRows.filter(item => !item.expected_sources.length)), { correct: 54, total: 66 });
  const positives = results.filter(item => item.mode === mode && item.strategy === 'qualified-bindings' && item.expected_sources.length);
  assert.equal(positives.filter(item => item.additional_sources.length).length, 56);
  assert.equal(positives.filter(item => item.correct && !item.additional_sources.length).length, 40);
}
const expectedExact = {
  lexical: [36, 62, 120, 208], 'drop-request': [36, 60, 118, 202], 'mask-call-arguments': [4, 58, 56, 136],
  'policy-guarded-arguments': [8, 60, 76, 158], 'local-bindings': [12, 60, 78, 162], 'clause-bindings': [30, 56, 96, 174], 'qualified-bindings': [40, 56, 114, 192],
};
for (const row of summary.scores) {
  const [exact, extra, relevant, retrieved] = expectedExact[row.strategy];
  assert.deepEqual(row.positive_exact, { correct: exact, total: 98 });
  assert.deepEqual(row.positive_with_additional_sources, { count: extra, total: 98 });
  assert.deepEqual(row.positive_source_precision, { relevant, retrieved });
  assert.equal(row.gates.accepted, false);
}
for (const row of summary.subsets.original.filter(row => row.strategy === 'qualified-bindings')) {
  assert.equal(row.gates.positive_recall, true);
  assert.equal(row.gates.positive_exact, false);
  assert.equal(row.gates.accepted, false);
}
assert.equal(summary.all_correct, independent.every(row => row.correct));
assert.equal(summary.all_precise_correct, independent.every(row => row.precise_correct));
const diagnostics = await json('positive-source-diagnostics.json');
const reports = [];
for (const mode of ['excerpts', 'rules_only']) for (const strategy of queryScopeStrategies) {
  const positives = independent.filter(row => row.mode === mode && row.strategy === strategy && row.repeat === 0 && row.expected_sources.length);
  const extras = [...new Set(positives.flatMap(row => row.additional_sources))].sort();
  reports.push({ mode, strategy, repeat: 0, positive_tasks: positives.length,
    additional_sources: extras.map(source => {
      const ids = positives.filter(row => row.additional_sources.includes(source)).map(row => row.id);
      return { source, tasks: ids.length, case_ids: ids };
    }),
    failed_positive_tasks: positives.filter(row => !row.precise_correct).map(row => ({ id: row.id, recall_passed: row.correct,
      missing_sources: row.missing_sources, missing_sentences: row.missing_sentences, additional_sources: row.additional_sources })) });
}
assert.deepEqual(diagnostics.reports, reports);
const sources = await json('checks/source-hashes.json');
for (const [path, expected] of Object.entries(sources)) assert.equal(hash(await readFile(join(repository, path))), expected, path);
const checks = await json('checks/checks.json');
assert.equal(checks.code_commit, 'df9e61770c0be040c2eb5044d41cfe1cb7c07e85');
for (const [name, exit] of Object.entries(checks.exits)) assert.equal(exit, name === 'scope' ? 1 : 0, name);
assert.equal(checks.prior_qualified_verifier_before_rebuild, 0);
assert.equal(checks.restricted_build_interrupted_exit, 130);
assert.equal(checks.local_process_and_ipc_access, true);
for (const name of ['production_changed', 'clean_install_repeated', 'audit_refreshed', 'ci_inspected', 'independent_scope_validation']) assert.equal(checks[name], false);
const tests = await readFile(join(root, 'checks/test.txt'), 'utf8');
assert.equal([...tests.matchAll(/Tests\s+(\d+) passed/g)].reduce((total, match) => total + Number(match[1]), 0), 305);
console.log(`Verified ${manifest.files.length} files, ${results.length} scope rows, 2,520 unchanged baseline rows, five subsets, independent precision/recall gates and 305 deterministic tests.`);
