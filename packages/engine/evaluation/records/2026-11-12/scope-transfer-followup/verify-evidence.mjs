import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '../../../../../..');
const compiled = join(repository, 'packages/engine/dist/src');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async name => JSON.parse(await readFile(join(root, name), 'utf8'));
const load = name => import(pathToFileURL(join(compiled, name)));
async function filesAt(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink());
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesAt(path));
    else { assert(entry.isFile()); files.push(relative(root, path).replaceAll('\\', '/')); }
  }
  return files.sort();
}
const manifest = await json('manifest.json');
assert.deepEqual((await filesAt(root)).filter(path => path !== 'manifest.json'), manifest.files.map(item => item.path).sort());
for (const item of manifest.files) {
  const bytes = await readFile(join(root, item.path));
  assert.equal(bytes.length, item.bytes, item.path);
  assert.equal(hash(bytes), item.sha256, item.path);
  if (/\.(?:json|txt|md)$/.test(item.path)) assert(!/\/Users\/|\/private\/var\/folders\/|account_rate_limits|access_token|refresh_token/.test(bytes.toString('utf8')), item.path);
}
for (const item of (await json('publication.json')).files) assert.equal(hash(await readFile(join(root, item.path))), item.published_sha256);

const { scopeTransferCases, scopeTransferDocuments } = await load('evaluation/scope-transfer-cases.js');
const { qualifiedBindingCases } = await load('evaluation/qualified-bindings-cases.js');
const { queryScopeDocuments, queryScopeCases } = await load('evaluation/query-scope-cases.js');
const { queryScopeTerms, qualifiedBindingStrategies: strategies } = await load('evaluation/query-scope.js');
const { countTokens } = await load('tokenizer.js');
const checks = await json('checks/checks.json');
const sourcePath = 'packages/engine/src/evaluation/scope-transfer-cases.ts';
assert.equal(hash(execFileSync('git', ['show', `${checks.fixture_commit}:${sourcePath}`], { cwd: repository })), hash(await readFile(join(repository, sourcePath))));
execFileSync('git', ['merge-base', '--is-ancestor', checks.fixture_commit, checks.code_commit], { cwd: repository });
assert.notEqual(checks.fixture_commit, checks.code_commit);
const sources = await json('checks/source-hashes.json');
for (const [path, expected] of Object.entries(sources)) assert.equal(hash(await readFile(join(repository, path))), expected, path);
assert.equal(scopeTransferCases.length, 30);
assert.equal(scopeTransferCases.filter(item => item.sources.length).length, 17);
assert.equal(scopeTransferDocuments.length, 8);
assert.equal(new Set(scopeTransferCases.map(item => item.id)).size, 30);
assert.equal(new Set(scopeTransferDocuments.map(item => item.name)).size, 8);
assert(scopeTransferDocuments.every(item => !queryScopeDocuments.some(old => old.name === item.name)));

// Recompute all evidence judgments and aggregates without evaluator score helpers.
const score = rows => {
  const positive = rows.filter(row => row.expected_sources.length);
  const noOp = rows.filter(row => !row.expected_sources.length);
  const count = subset => ({ correct: subset.filter(row => row.correct).length, total: subset.length });
  let relevant = 0, retrieved = 0;
  for (const row of positive) for (const source of new Set(row.actual_sources)) {
    retrieved++;
    if (row.expected_sources.includes(source)) relevant++;
  }
  const gates = { positive_recall: positive.every(row => row.correct), positive_exact: positive.every(row => row.precise_correct),
    no_op: noOp.every(row => row.correct), citations_exact: rows.every(row => row.citations_exact), token_caps: rows.every(row => row.cap_passed) };
  return { positive: count(positive), no_op: count(noOp), combined: count(rows),
    positive_exact: { correct: positive.filter(row => row.precise_correct).length, total: positive.length },
    positive_with_additional_sources: { count: positive.filter(row => row.additional_sources.length).length, total: positive.length },
    positive_source_precision: { relevant, retrieved }, citations_exact: gates.citations_exact, caps_passed: gates.token_caps,
    gates: { ...gates, accepted: rows.length > 0 && Object.values(gates).every(Boolean) } };
};
const scores = rows => ['excerpts', 'rules_only'].flatMap(mode => strategies.map(strategy => ({ mode, strategy,
  ...score(rows.filter(row => row.mode === mode && row.strategy === strategy)) })));
const escapeXml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const runs = {};
for (const [name, fixtures, documents, corpus] of [
  ['transfer', scopeTransferCases, scopeTransferDocuments, 'scope-transfer'],
  ['historical', qualifiedBindingCases, queryScopeDocuments, 'qualified-bindings'],
]) {
  const protocol = await json(`${name}/protocol.json`);
  assert.equal(protocol.protocol, 'query-scope-shadow-v3');
  assert.equal(protocol.corpus, corpus);
  assert.equal(protocol.repeats, 2);
  assert.deepEqual(protocol.cases, fixtures);
  assert.deepEqual(protocol.documents, documents);
  assert.deepEqual(protocol.strategies, strategies);
  assert.deepEqual(protocol.original_case_ids, queryScopeCases.map(item => item.id));
  assert.equal(protocol.fixture_sha256, hash(JSON.stringify({ documents, cases: fixtures })));
  for (const [path, expected] of Object.entries(protocol.artifacts)) assert.equal(hash(await readFile(resolve(compiled, 'evaluation', path))), expected, path);
  const rows = await json(`${name}/results.json`);
  const summary = await json(`${name}/summary.json`);
  assert.deepEqual(JSON.parse(await readFile(join(root, `checks/${name}.txt`), 'utf8')), summary);
  assert.equal(summary.completed, true);
  assert.equal(summary.rows, 2 * 2 * fixtures.length * strategies.length);
  assert.equal(rows.length, summary.rows);
  const cases = new Map(fixtures.map(item => [item.id, item]));
  const texts = new Map(documents.map(item => [item.name, item.text]));
  const keys = new Set();
  for (const row of rows) {
    const key = JSON.stringify([row.id, row.mode, row.strategy, row.repeat]);
    assert(!keys.has(key)); keys.add(key);
    const fixture = cases.get(row.id); assert(fixture);
    assert.deepEqual(row.expected_sources, fixture.sources);
    assert.equal(row.family, fixture.family);
    assert.deepEqual(row.terms, queryScopeTerms(fixture.query, row.strategy));
    assert.equal(row.query, row.strategy === 'lexical' ? fixture.query : row.terms.join(' ') || '?');
    const actual = [...new Set(row.evidence.map(item => basename(item.source)))].sort();
    const missing = fixture.sources.filter(source => !actual.includes(source));
    const missingSentences = [];
    for (const source of fixture.sources) {
      assert(texts.has(source));
      const quotes = row.evidence.filter(item => basename(item.source) === source).map(item => item.quote);
      for (const { segment } of new Intl.Segmenter('en', { granularity: 'sentence' }).segment(texts.get(source))) {
        const sentence = segment.trim();
        if (!quotes.some(quote => quote.includes(sentence))) missingSentences.push({ source, sentence });
      }
    }
    assert.deepEqual(row.actual_sources, actual);
    assert.deepEqual(row.missing_sources, missing);
    assert.deepEqual(row.missing_sentences, missingSentences);
    assert.deepEqual(row.additional_sources, actual.filter(source => !fixture.sources.includes(source)));
    for (const item of row.evidence) {
      assert.equal(item.source, `s1/${basename(item.source)}`);
      assert(item.quote.trim() && texts.get(basename(item.source))?.includes(item.quote));
      assert(row.text.includes(escapeXml(item.quote)));
      assert(row.text.includes(`<citation source="${item.source}" at="lines 1-1"/>`));
    }
    assert.equal((row.text.match(/<citation /g) ?? []).length, row.evidence.length);
    const tokens = countTokens(row.text, 'o200k_base');
    assert(tokens <= 500);
    assert.equal(Number(/ tokens="(\d+)"/.exec(row.text)?.[1]), tokens);
    assert.equal(row.citations_exact, true);
    assert.equal(row.cap_passed, true);
    const correct = fixture.sources.length ? missing.length === 0 && missingSentences.length === 0 : row.evidence.length === 0;
    assert.equal(row.correct, correct);
    assert.equal(row.precise_correct, correct && row.additional_sources.length === 0);
    assert(Number.isFinite(row.component_wall_ms) && row.component_wall_ms >= 0);
  }
  const order = [];
  for (let repeat = 0; repeat < 2; repeat++) for (const mode of ['excerpts', 'rules_only']) {
    for (const fixture of repeat ? [...fixtures].reverse() : fixtures) for (let index = 0; index < strategies.length; index++) order.push([fixture.id, mode, strategies[(index + repeat) % strategies.length], repeat]);
  }
  assert.deepEqual(rows.map(row => [row.id, row.mode, row.strategy, row.repeat]), order);
  for (const row of rows.filter(item => item.repeat === 1)) {
    const first = rows.find(item => item.repeat === 0 && item.id === row.id && item.mode === row.mode && item.strategy === row.strategy);
    for (const field of ['terms', 'text', 'evidence', 'correct', 'precise_correct']) assert.deepEqual(row[field], first[field]);
  }
  assert.deepEqual(summary.scores, scores(rows));
  assert.equal(summary.all_correct, rows.every(row => row.correct));
  assert.equal(summary.all_precise_correct, rows.every(row => row.precise_correct));
  assert(summary.scores.every(row => !row.gates.accepted));
  runs[name] = { protocol, rows, summary };
}
assert.deepEqual(runs.transfer.summary.subsets, { transfer: runs.transfer.summary.scores });
for (const key of ['policy_guard', 'local_bindings', 'clause_bindings', 'qualified_bindings']) assert(!(key in runs.transfer.summary));
const priorRoot = resolve(root, '../../2026-11-11/positive-precision-followup');
const priorManifest = JSON.parse(await readFile(join(priorRoot, 'manifest.json'), 'utf8'));
const priorJson = async name => {
  const bytes = await readFile(join(priorRoot, name));
  assert.equal(hash(bytes), priorManifest.files.find(item => item.path === name).sha256);
  return JSON.parse(bytes);
};
const priorRows = await priorJson('final/results.json');
assert.equal(priorRows.length, 2520);
assert.equal(runs.historical.rows.length, priorRows.length);
for (let index = 0; index < priorRows.length; index++) {
  const { component_wall_ms: oldTime, ...old } = priorRows[index];
  const { component_wall_ms: newTime, ...current } = runs.historical.rows[index];
  assert.deepEqual(current, old, `Historical row ${index}`);
}
const { results: oldResults, ...oldSummary } = await priorJson('final/summary.json');
const { results: newResults, ...newSummary } = runs.historical.summary;
assert.deepEqual(newSummary, oldSummary);
const priorProtocol = await priorJson('final/protocol.json');
for (const [path, expected] of Object.entries(priorProtocol.artifacts)) if (path !== 'query-scope.js') assert.equal(runs.historical.protocol.artifacts[path], expected, `Unchanged component ${path}`);
const expected = { lexical: [34, 4, 4, 42, 78], 'drop-request': [34, 4, 4, 42, 78],
  'mask-call-arguments': [22, 4, 10, 28, 58], 'policy-guarded-arguments': [28, 4, 10, 36, 68],
  'local-bindings': [28, 4, 14, 36, 68], 'clause-bindings': [30, 4, 14, 38, 70], 'qualified-bindings': [30, 4, 16, 38, 72] };
for (const row of runs.transfer.summary.scores) {
  const [recall, exact, noOp, relevant, retrieved] = expected[row.strategy];
  assert.deepEqual(row.positive, { correct: recall, total: 34 });
  assert.deepEqual(row.positive_exact, { correct: exact, total: 34 });
  assert.deepEqual(row.no_op, { correct: noOp, total: 26 });
  assert.deepEqual(row.positive_source_precision, { relevant, retrieved });
}
assert.equal(checks.client_date, '2026-11-12');
assert.equal(checks.prior_precision_verifier_before_rebuild, 0);
assert.equal(checks.local_process_and_ipc_access, true);
for (const [name, exit] of Object.entries(checks.exits)) assert.equal(exit, ['transfer', 'historical'].includes(name) ? 1 : 0, name);
for (const name of ['production_changed', 'strategies_changed', 'clean_install_repeated', 'audit_refreshed', 'ci_inspected', 'independent_human_validation']) assert.equal(checks[name], false);
const tests = await readFile(join(root, 'checks/test.txt'), 'utf8');
assert.equal([...tests.matchAll(/Tests\s+(\d+) passed/g)].reduce((total, match) => total + Number(match[1]), 0), 308);
console.log(`Verified ${manifest.files.length} files, 840 transfer rows, 2,520 unchanged historical rows, independent evidence/score recomputation and 308 deterministic tests.`);
