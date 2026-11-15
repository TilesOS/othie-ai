import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { summarizeEvidence } from './summarize-evidence.mjs';

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
for (const [path, expected] of Object.entries(await json('checks/source-hashes.json'))) assert.equal(hash(await readFile(join(repository, path))), expected, path);
const checks = await json('checks/checks.json');
const changed = execFileSync('git', ['diff', '--name-only', checks.prior_commit, checks.code_commit], { cwd: repository, encoding: 'utf8' }).trim().split('\n').sort();
assert.deepEqual(changed, ['packages/engine/src/evaluation/query-scope.ts', 'packages/engine/src/evaluation/scope-term-diagnostics.ts', 'packages/engine/test/scope-term-diagnostics.test.ts']);
const { countTokens } = await load('tokenizer.js');
const { qualifiedBindingStrategies: strategies, queryScopeTerms } = await load('evaluation/query-scope.js');
const priorRoot = resolve(root, '../../2026-11-12/scope-transfer-followup');
const priorManifest = JSON.parse(await readFile(join(priorRoot, 'manifest.json'), 'utf8'));
const priorJson = async name => {
  const bytes = await readFile(join(priorRoot, name));
  assert.equal(hash(bytes), priorManifest.files.find(item => item.path === name).sha256);
  return JSON.parse(bytes);
};
const stable = ({ component_wall_ms, ...row }) => row;
const words = text => new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
const escapeXml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const aggregate = rows => {
  const positive = rows.filter(row => row.expected_sources.length), noOp = rows.filter(row => !row.expected_sources.length);
  const count = items => ({ correct: items.filter(row => row.correct).length, total: items.length });
  const gates = { positive_recall: positive.every(row => row.correct), positive_exact: positive.every(row => row.precise_correct),
    no_op: noOp.every(row => row.correct), citations_exact: rows.every(row => row.citations_exact), token_caps: rows.every(row => row.cap_passed) };
  const memberships = positive.flatMap(row => [...new Set(row.actual_sources)].map(source => row.expected_sources.includes(source)));
  return { positive: count(positive), no_op: count(noOp), combined: count(rows),
    positive_exact: { correct: positive.filter(row => row.precise_correct).length, total: positive.length },
    positive_with_additional_sources: { count: positive.filter(row => row.additional_sources.length).length, total: positive.length },
    positive_source_precision: { relevant: memberships.filter(Boolean).length, retrieved: memberships.length },
    citations_exact: gates.citations_exact, caps_passed: gates.token_caps,
    gates: { ...gates, accepted: rows.length > 0 && Object.values(gates).every(Boolean) } };
};
const findings = await json('findings.json');
let totalRows = 0, totalProbes = 0;
for (const name of ['transfer', 'historical']) {
  const protocol = await json(`${name}/protocol.json`), priorProtocol = await priorJson(`${name}/protocol.json`);
  assert.deepEqual(protocol.cases, priorProtocol.cases);
  assert.deepEqual(protocol.documents, priorProtocol.documents);
  assert.deepEqual(protocol.strategies, strategies);
  assert.equal(protocol.fixture_sha256, priorProtocol.fixture_sha256);
  assert.equal(protocol.protocol, priorProtocol.protocol);
  assert.equal(protocol.corpus, priorProtocol.corpus);
  assert.equal(protocol.repeats, 2);
  assert.equal(protocol.diagnostics.protocol, 'scope-term-ablation-v1');
  for (const [path, expected] of Object.entries(protocol.artifacts)) assert.equal(hash(await readFile(resolve(compiled, 'evaluation', path))), expected, path);
  for (const [path, expected] of Object.entries(priorProtocol.artifacts)) if (path !== 'query-scope.js') assert.equal(protocol.artifacts[path], expected, path);
  const rows = await json(`${name}/results.json`), summary = await json(`${name}/summary.json`);
  const previous = await priorJson(`${name}/results.json`);
  assert.deepEqual(rows.map(stable), previous.map(stable));
  assert.deepEqual(summary, await priorJson(`${name}/summary.json`));
  assert.deepEqual(summary, await json(`checks/${name}.txt`));
  assert.deepEqual(summary.scores, ['excerpts', 'rules_only'].flatMap(mode => strategies.map(strategy => ({ mode, strategy,
    ...aggregate(rows.filter(row => row.mode === mode && row.strategy === strategy)) }))));
  assert.equal(summary.rows, rows.length);
  assert.equal(summary.all_correct, rows.every(row => row.correct));
  assert.equal(summary.all_precise_correct, rows.every(row => row.precise_correct));
  assert(summary.scores.every(row => !row.gates.accepted));
  const cases = new Map(protocol.cases.map(item => [item.id, item]));
  const texts = new Map(protocol.documents.map(item => [item.name, item.text]));
  const vocabulary = new Set(protocol.documents.flatMap(document => [...words(document.text)]));
  function verifyRow(row) {
    const fixture = cases.get(row.id); assert(fixture);
    assert.equal(row.family, fixture.family);
    assert.deepEqual(row.expected_sources, fixture.sources);
    const actual = [...new Set(row.evidence.map(item => basename(item.source)))].sort();
    const missing = fixture.sources.filter(source => !actual.includes(source));
    const missingSentences = fixture.sources.flatMap(source => [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(texts.get(source))]
      .map(({ segment }) => segment.trim()).filter(sentence => !row.evidence.some(item => basename(item.source) === source && item.quote.includes(sentence)))
      .map(sentence => ({ source, sentence })));
    assert.deepEqual(row.actual_sources, actual);
    assert.deepEqual(row.missing_sources, missing);
    assert.deepEqual(row.missing_sentences, missingSentences);
    const additional = actual.filter(source => !fixture.sources.includes(source));
    assert.deepEqual(row.additional_sources, additional);
    for (const item of row.evidence) {
      assert.equal(item.source, `s1/${basename(item.source)}`);
      assert(item.quote.trim() && texts.get(basename(item.source))?.includes(item.quote));
      assert(row.text.includes(escapeXml(item.quote)));
      assert(row.text.includes(`<citation source="${item.source}" at="lines 1-1"/>`));
    }
    assert.equal((row.text.match(/<citation /g) ?? []).length, row.evidence.length);
    const tokens = countTokens(row.text, 'o200k_base'); assert(tokens <= 500);
    assert.equal(Number(/ tokens="(\d+)"/.exec(row.text)?.[1]), tokens);
    assert.equal(row.citations_exact, true); assert.equal(row.cap_passed, true);
    const correct = fixture.sources.length ? !missing.length && !missingSentences.length : !row.evidence.length;
    assert.equal(row.correct, correct);
    assert.equal(row.precise_correct, correct && !additional.length);
    assert(Number.isFinite(row.component_wall_ms) && row.component_wall_ms >= 0);
  }
  for (const row of rows) {
    verifyRow(row);
    assert.deepEqual(row.terms, queryScopeTerms(cases.get(row.id).query, row.strategy));
  }
  const diagnostics = await json(`${name}/term-diagnostics.json`);
  assert.equal(diagnostics.protocol, 'scope-term-ablation-v1');
  assert.equal(diagnostics.cases.length, protocol.cases.length * 4);
  const expectedOrder = [];
  for (let repeat = 0; repeat < 2; repeat++) for (const mode of ['excerpts', 'rules_only']) {
    for (const fixture of repeat ? [...protocol.cases].reverse() : protocol.cases) expectedOrder.push([fixture.id, mode, repeat]);
  }
  assert.deepEqual(diagnostics.cases.map(row => [row.id, row.mode, row.repeat]), expectedOrder);
  let probes = 0;
  for (const diagnostic of diagnostics.cases) {
    assert.equal(diagnostic.strategy, 'qualified-bindings');
    const base = rows.find(row => row.id === diagnostic.id && row.mode === diagnostic.mode && row.repeat === diagnostic.repeat && row.strategy === diagnostic.strategy);
    assert(base);
    const expectedMatches = protocol.documents.flatMap(document => {
      const sentences = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(document.text)].map(({ segment }, index) => {
        const text = segment.trim(), tokens = words(text);
        return { index, text, terms: base.terms.filter(term => tokens.has(term)) };
      }).filter(sentence => sentence.terms.length);
      return sentences.length ? [{ source: document.name, sentences }] : [];
    });
    assert.deepEqual(diagnostic.matches, expectedMatches);
    const matching = base.terms.filter(term => vocabulary.has(term));
    assert.equal(diagnostic.interventions.length, matching.length * 2);
    let index = 0;
    for (const term of matching) for (const kind of ['only-term', 'without-term']) {
      const probe = diagnostic.interventions[index++], result = probe.result;
      assert.equal(probe.kind, kind); assert.equal(probe.term, term);
      const expectedTerms = kind === 'only-term' ? [term] : base.terms.filter(item => item !== term);
      assert.deepEqual(probe.terms, expectedTerms); assert.deepEqual(result.terms, expectedTerms);
      assert.equal(result.query, expectedTerms.join(' ') || '?');
      for (const key of ['id', 'mode', 'repeat', 'strategy']) assert.equal(result[key], base[key]);
      verifyRow(result);
      assert.deepEqual(probe.removed_sources, base.actual_sources.filter(source => !result.actual_sources.includes(source)));
      assert.deepEqual(probe.added_sources, result.actual_sources.filter(source => !base.actual_sources.includes(source)));
    }
    probes += diagnostic.interventions.length;
    if (diagnostic.repeat === 1) {
      const first = diagnostics.cases.find(item => item.id === diagnostic.id && item.mode === diagnostic.mode && item.repeat === 0);
      assert.deepEqual(diagnostic.matches, first.matches);
      const stableProbe = ({ result, ...probe }) => {
        const { repeat, component_wall_ms, ...evidence } = result;
        return { ...probe, result: evidence };
      };
      assert.deepEqual(diagnostic.interventions.map(stableProbe), first.interventions.map(stableProbe));
    }
  }
  assert.equal(diagnostics.probe_count, probes);
  assert.equal(probes, name === 'transfer' ? 376 : 920);
  assert.deepEqual(findings[name], summarizeEvidence(rows, diagnostics));
  totalRows += rows.length; totalProbes += probes;
}
assert.equal(totalRows, 3360); assert.equal(totalProbes, 1296);
assert.equal(checks.prior_transfer_verifier_before_changes, true);
assert.equal(checks.local_process_and_ipc_access, true);
for (const [name, exit] of Object.entries(checks.exits)) assert.equal(exit, ['transfer', 'historical'].includes(name) ? 1 : 0, name);
for (const key of ['production_changed', 'strategies_changed', 'fixtures_changed', 'clean_install_repeated', 'audit_refreshed', 'ci_inspected', 'independent_human_validation']) assert.equal(checks[key], false);
const tests = await readFile(join(root, 'checks/test.txt'), 'utf8');
assert.equal([...tests.matchAll(/Tests\s+(\d+) passed/g)].reduce((sum, match) => sum + Number(match[1]), 0), 314);
console.log(`Verified ${manifest.files.length} files, ${totalRows} unchanged baseline rows, ${totalProbes} retrieval probes, sentence traces, independent evidence/score checks and 314 deterministic tests.`);
