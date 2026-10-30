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

const { queryScopeCases, queryScopeDocuments } = await import(pathToFileURL(join(compiled, 'evaluation/query-scope-cases.js')));
const { queryScopeTerms, queryScopeStrategies } = await import(pathToFileURL(join(compiled, 'evaluation/query-scope.js')));
const { countTokens } = await import(pathToFileURL(join(compiled, 'tokenizer.js')));
const { applicabilityQualityCases } = await import(pathToFileURL(join(compiled, 'evaluation/quality-cases.js')));
const protocol = await json('final/protocol.json');
assert.equal(protocol.protocol, 'query-scope-shadow-v1');
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
const expectedScores = ['excerpts', 'rules_only'].flatMap(mode => queryScopeStrategies.map(strategy => {
  const rows = independent.filter(row => row.mode === mode && row.strategy === strategy);
  return { mode, strategy, positive: count(rows.filter(row => row.expected_sources.length)), no_op: count(rows.filter(row => !row.expected_sources.length)), combined: count(rows), citations_exact: true, caps_passed: true };
}));
assert.deepEqual(summary.scores, expectedScores);
for (const row of results.filter(item => item.repeat > 0)) {
  const first = results.find(item => item.repeat === 0 && item.id === row.id && item.mode === row.mode && item.strategy === row.strategy);
  for (const field of ['correct', 'evidence', 'missing_sources', 'missing_sentences']) assert.deepEqual(row[field], first[field]);
}
assert.deepEqual(summary.previous_applicability_query_terms, queryScopeStrategies.map(strategy => ({ strategy, total: applicabilityQualityCases.length,
  unchanged: applicabilityQualityCases.filter(item => JSON.stringify(queryScopeTerms(item.query, strategy)) === JSON.stringify(queryScopeTerms(item.query, 'lexical'))).length })));
for (const prior of ['initial-unmapped', 'mapped-before-citation-guard']) {
  const old = await json(`${prior}/summary.json`);
  assert.equal(old.completed, true); assert.equal(old.all_correct, false); assert.equal(old.rows, results.length);
  assert.equal((await json(`${prior}/results.json`)).length, results.length);
  if (prior === 'initial-unmapped') assert(old.scores.every(score => score.positive.correct === 0 && !score.citations_exact));
  else assert.deepEqual(old.scores, summary.scores);
}
const ci = await json('ci-9f416fe.json');
assert.equal(ci.run.head_sha, '9f416fe38d49c9f257c9274c3af04a82209a640a');
assert.equal(ci.run.conclusion, 'success');
assert.deepEqual(ci.jobs.map(job => job.name).sort(), ['desktop (macos-14)', 'desktop (windows-latest)']);
for (const job of ci.jobs) {
  assert.equal(job.conclusion, 'success');
  const steps = new Map(job.steps.map(step => [step.name, step.conclusion]));
  for (const step of ['Run npm ci', 'Run npm run typecheck', 'Run npm test']) assert.equal(steps.get(step), 'success');
  if (job.name.includes('windows')) assert.equal(steps.get('Check Windows startup script syntax'), 'success');
}
const checks = await json('checks/checks.json');
for (const check of checks.validation) assert.equal(check.exit_code, 0);
for (const audit of ['checks/audit-full.json', 'checks/audit-production.json']) assert.equal((await json(audit)).metadata.vulnerabilities.total, 0);
assert.equal(checks.scope.exit_code, 1);
assert.equal(checks.scope.completed, true);
console.log(`Verified ${manifest.files.length} files, ${results.length} scope results, independent scores, citation/token gates, preserved failures and both CI jobs.`);
