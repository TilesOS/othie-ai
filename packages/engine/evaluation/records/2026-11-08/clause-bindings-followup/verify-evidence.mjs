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
const { queryScopeTerms, clauseBindingStrategies: queryScopeStrategies } = await import(pathToFileURL(join(compiled, 'evaluation/query-scope.js')));
const { localBindingCases, localBindingCounterexamples } = await import(pathToFileURL(join(compiled, 'evaluation/local-bindings-cases.js')));
const { clauseBindingCases: queryScopeCases, clauseBindingCounterexamples } = await import(pathToFileURL(join(compiled, 'evaluation/clause-bindings-cases.js')));
const { policyGuardCases } = await import(pathToFileURL(join(compiled, 'evaluation/policy-guard-cases.js')));
const { countTokens } = await import(pathToFileURL(join(compiled, 'tokenizer.js')));
const { applicabilityQualityCases } = await import(pathToFileURL(join(compiled, 'evaluation/quality-cases.js')));
const protocol = await json('final/protocol.json');
assert.equal(protocol.protocol, 'query-scope-shadow-v2');
assert.equal(protocol.corpus, 'clause-bindings');
assert.deepEqual(queryScopeCases.slice(0, 57), localBindingCases);
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
assert.equal(results.length, protocol.repeats * 2 * queryScopeCases.length * queryScopeStrategies.length);
assert.equal(summary.rows, results.length);
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
  independent.push({ ...row, correct: scenario.sources.length ? missingSources.length === 0 && missingSentences.length === 0 : row.evidence.length === 0 });
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
  return { mode, strategy, positive: count(rows.filter(row => row.expected_sources.length)), no_op: count(rows.filter(row => !row.expected_sources.length)), combined: count(rows), citations_exact: true, caps_passed: true };
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
// Keep a paired comparison with all 1,140 preceding rows, without relying on
// the old evaluator's now-superseded compiled hashes.
const priorRoot = resolve(root, '../../2026-11-07/local-bindings-followup');
const priorManifest = JSON.parse(await readFile(join(priorRoot, 'manifest.json'), 'utf8'));
const priorJson = async name => {
  const bytes = await readFile(join(priorRoot, name));
  assert.equal(hash(bytes), priorManifest.files.find(item => item.path === name).sha256);
  return JSON.parse(bytes);
};
const priorProtocol = await priorJson('final/protocol.json');
assert.deepEqual(priorProtocol.cases, localBindingCases);
assert.deepEqual(priorProtocol.documents, protocol.documents);
const paired = await priorJson('final/results.json');
assert.equal(paired.length, 1140);
for (const prior of paired) {
  const current = results.find(row => row.id === prior.id && row.mode === prior.mode && row.strategy === prior.strategy && row.repeat === prior.repeat);
  assert(current);
  for (const field of ['query', 'terms', 'correct', 'evidence', 'text', 'actual_sources', 'missing_sources', 'missing_sentences', 'additional_sources', 'citations_exact', 'cap_passed']) assert.deepEqual(current[field], prior[field], `${prior.id}: ${field}`);
}

const guardIds = new Set(policyGuardCases.filter(row => !originalIds.has(row.id)).map(row => row.id));
const bindingIds = new Set(localBindingCounterexamples.map(row => row.id));
assert.deepEqual(summary.policy_guard, scoresFor(independent.filter(row => guardIds.has(row.id))));
assert.deepEqual(summary.local_bindings, scoresFor(independent.filter(row => bindingIds.has(row.id))));
const clauseIds = new Set(clauseBindingCounterexamples.map(row => row.id));
assert.deepEqual(summary.clause_bindings, scoresFor(independent.filter(row => clauseIds.has(row.id))));
const expected = {
  lexical: [82, 4], 'drop-request': [80, 32], 'mask-call-arguments': [44, 28],
  'policy-guarded-arguments': [56, 16], 'local-bindings': [62, 46], 'clause-bindings': [78, 50],
};
for (const mode of ['excerpts', 'rules_only']) {
  for (const strategy of queryScopeStrategies) {
    const candidate = summary.scores.find(row => row.mode === mode && row.strategy === strategy);
    assert.deepEqual(candidate.positive, { correct: expected[strategy][0], total: 82 });
    assert.deepEqual(candidate.no_op, { correct: expected[strategy][1], total: 66 });
  }
  const row = id => results.find(item => item.id === id && item.mode === mode && item.strategy === 'clause-bindings' && item.repeat === 0);
  for (const id of ['implicit-refund', 'policy-without-magic-word', 'quoted-policy-subject', 'mixed-separated-refund', 'mixed-same-sentence-refund', 'policy-numeric-refund', 'negated-local-refund', 'local-function-name', 'local-quoted-identifier', 'clause-trailing-company']) assert.equal(row(id).correct, true);
  for (const id of ['clause-trailing-isolated', 'clause-negated-only', 'clause-negated-policy-same', 'clause-adverb-negation']) assert.equal(row(id).correct, false);
  // All positives in the retained 57-case corpus must survive, not just the
  // three named recovery examples; six prior no-op failures remain visible.
  const priorIds = new Set(localBindingCases.map(item => item.id));
  const priorRows = results.filter(item => item.mode === mode && item.strategy === 'clause-bindings' && priorIds.has(item.id));
  assert.deepEqual(count(priorRows.filter(item => item.expected_sources.length)), { correct: 60, total: 60 });
  assert.deepEqual(count(priorRows.filter(item => !item.expected_sources.length)), { correct: 42, total: 54 });
}
const initialHashes = await json('initial/source-hashes.json');
for (const [path, expectedHash] of Object.entries(initialHashes)) assert.equal(hash(await readFile(join(root, 'initial', basename(path)))), expectedHash);
const initialCases = await readFile(join(root, 'initial/clause-bindings-cases.ts'), 'utf8');
assert(initialCases.includes('clause-trailing-company'));
assert(!initialCases.includes('clause-trailing-isolated'));
const initialTests = await readFile(join(root, 'checks/focused-initial.txt'), 'utf8');
assert(initialTests.includes('clause-trailing-company: expected true to be false'));
assert(/14 passed/.test(initialTests));
const ci = await json('checks/ci-4c34b0f.json');
assert.equal(ci.run.head_sha, '4c34b0fff25c1e57338215c6fc88bec8c85a6094');
assert.equal(ci.run.id, 42516720548);
assert.equal(ci.run.conclusion, 'cancelled');
const windows = ci.jobs.find(job => job.name === 'desktop (windows-latest)');
assert.equal(windows.conclusion, 'success');
for (const name of ['Run npm ci', 'Run npm run typecheck', 'Run npm run lint --workspace=@othie/website', 'Run npm test', 'Check Windows startup script syntax']) assert.equal(windows.steps.find(step => step.name === name).conclusion, 'success');
const mac = ci.jobs.find(job => job.name === 'desktop (macos-14)');
assert.equal(mac.conclusion, 'cancelled');
assert.equal(mac.steps, null);
const sources = await json('checks/source-hashes.json');
for (const [path, expected] of Object.entries(sources)) assert.equal(hash(await readFile(join(repository, path))), expected, path);
const checks = await json('checks/checks.json');
assert.equal(checks.code_commit, '66c7154');
for (const [name, exit] of Object.entries(checks.exits)) assert.equal(exit, name === 'scope' ? 1 : 0, name);
assert.equal(checks.clean_install_repeated, false);
assert.equal(checks.audit_refreshed, false);
assert.equal(checks.initial_focused_test.exit_code, 1);
assert.equal(checks.ci_inspected, true);
const tests = await readFile(join(root, 'checks/test.txt'), 'utf8');
assert.equal([...tests.matchAll(/Tests\s+(\d+) passed/g)].reduce((total, match) => total + Number(match[1]), 0), 296);
console.log(`Verified ${manifest.files.length} files, ${results.length} scope rows, 1,140 unchanged baseline rows, separate subsets, citation/token gates and 296 deterministic tests.`);
