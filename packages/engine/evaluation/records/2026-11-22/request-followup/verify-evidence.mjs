import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { queryScopeScores } from '../../../../dist/src/evaluation/query-scope-metrics.js';
import { scoreQueryScope } from '../../../../dist/src/evaluation/query-scope.js';
import { scopeContrasts } from '../../../../dist/src/evaluation/scope-contrast-cases.js';
import { requestAdmission } from '../../../../dist/src/evaluation/scope-request.js';
import { countTokens } from '../../../../dist/src/tokenizer.js';

const root = dirname(fileURLToPath(import.meta.url));
const [directory, action, ...extra] = process.argv.slice(2);
assert(directory && (!action || action === '--record') && !extra.length,
  'Usage: node verify-evidence.mjs <five-corpus run directory> [--record]');
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const sha = (text) => createHash('sha256').update(text).digest('hex');
const digest = (value) => sha(JSON.stringify(value));
const stable = ({ component_wall_ms, ...row }) => row;
const reportDigest = (report) => digest({ ...report, rows: report.rows.map(stable) });
const modes = ['excerpts', 'rules_only'];
const strategies = ['reference-focus', 'request-union', 'request-specific'];
const prior = await json(join(root, '../../2026-11-21/reference-followup/run.json'));
const priorContrast = await json(join(root, '../../2026-11-21/contrast-followup/run.json'));
const corpora = {
  'qualified-bindings': prior.corpora.historical,
  'scope-transfer': prior.corpora.transfer,
  'scope-reference': prior.corpora.reference,
  'scope-contrast': priorContrast,
  'scope-request': null,
};
const record = {
  fixture_revision: 'a0c7930b01c3034efde8ba5f39a56c14d67d8b3b',
  source_revision: 'f65ce08fdc6b1bdb4b3636d1978db6342f0b2291',
  corpora: {},
};
const evidence = [];

for (const [name, previous] of Object.entries(corpora)) {
  const folder = resolve(directory, name);
  const load = (file) => json(join(folder, file));
  const [protocol, rows, summary, assertion, reference, requests] = await Promise.all([
    load('protocol.json'), load('results.json'), load('summary.json'), load('assertion-candidates.json'),
    load('reference-candidates.json'), load('request-candidates.json'),
  ]);
  const previousRows = { baseline: rows.length, assertion: assertion.rows.length, reference: reference.rows.length };
  assert.equal(protocol.repeats, 2);
  assert(summary.completed);
  assert.equal(summary.rows, rows.length);
  assert.equal(protocol.corpus, name);
  assert.equal(protocol.fixture_sha256, digest({ documents: protocol.documents, cases: protocol.cases }));
  assert.deepEqual(protocol.request_candidate.strategies, strategies.slice(1));
  if (previous) {
    const { request_candidate, recorded_at, node, platform, artifacts, ...frozen } = protocol;
    const { artifacts: originalArtifacts, recorded_at: originalDate, node: originalNode, platform: originalPlatform, ...original } = previous.protocol;
    assert.deepEqual(frozen, original);
    const { 'scope-request.js': candidateHash, 'query-scope.js': evaluatorHash, ...frozenArtifacts } = artifacts;
    assert(candidateHash && evaluatorHash);
    assert.deepEqual(frozenArtifacts, Object.fromEntries(Object.entries(originalArtifacts).filter(([file]) => file !== 'query-scope.js')));
    if (name === 'scope-contrast') {
      assert.equal(digest(rows.map(stable)), previous.reports['results.json'].stable_rows_sha256);
      assert.equal(digest(summary), previous.reports['results.json'].summary_sha256);
      for (const [file, report] of [['assertion-candidates.json', assertion], ['reference-candidates.json', reference]]) {
        assert.equal(digest(report.rows.map(stable)), previous.reports[file].stable_rows_sha256);
        assert.equal(digest({ ...report, rows: undefined }), previous.reports[file].summary_sha256);
      }
    } else {
      assert.equal(rows.length, previous.baseline.rows);
      assert.equal(digest(rows.map(stable)), previous.baseline.stable_rows_sha256);
      assert.equal(digest(summary), previous.baseline.summary_sha256);
      assert.equal(reportDigest(assertion), previous.assertion_sha256);
      assert.equal(reportDigest(reference), previous.reference_sha256);
    }
  }

  const cases = new Map(protocol.cases.map((scenario) => [scenario.id, scenario]));
  const documents = new Map(protocol.documents.map(({ name, text }) => [name, text]));
  const key = ({ repeat, strategy, mode, id }) => `${repeat}/${strategy}/${mode}/${id}`;
  const allRows = [...reference.rows.filter(({ strategy }) => strategy === 'reference-focus'), ...requests.rows];
  const byKey = new Map(allRows.map((row) => [key(row), row]));
  assert.equal(allRows.length, 2 * modes.length * strategies.length * cases.size);
  assert.equal(byKey.size, allRows.length);
  for (const row of requests.rows) {
    const scenario = cases.get(row.id);
    assert(scenario);
    const { terms, clauses, admitted, assertions } = requestAdmission(scenario.query, protocol.documents, row.strategy === 'request-specific');
    assert.deepEqual({ terms, clauses, admitted, assertions }, { terms: row.terms, clauses: row.clauses, admitted: row.admitted, assertions: row.assertions });
    assert.deepEqual(row.expected_sources, scenario.sources);
    assert.equal(row.query, terms.join(' ') || '?');
    assert.deepEqual(row.actual_sources, row.prepack_sources);
    assert(row.actual_sources.every((source) => admitted.includes(source)));
    for (const { source, quote } of row.evidence) {
      assert.equal(source, `s1/${basename(source)}`);
      assert(quote.trim() && documents.get(basename(source)).includes(quote));
      assert(row.text.includes(`<citation source="${source}" at="lines 1-1"/>`));
    }
    const tokens = countTokens(row.text, 'o200k_base');
    assert(tokens <= 500);
    assert.equal(Number(/ tokens="(\d+)"/.exec(row.text)?.[1]), tokens);
    assert(row.citations_exact && row.cap_passed);
    for (const [field, value] of Object.entries(scoreQueryScope(scenario, row.evidence, protocol.documents))) {
      assert.deepEqual(row[field], value);
    }
  }

  const scores = modes.flatMap((mode) => strategies.map((strategy) => ({ mode, strategy,
    ...queryScopeScores(allRows.filter((row) => row.mode === mode && row.strategy === strategy)) })));
  assert.deepEqual(scores.filter(({ strategy }) => strategy !== 'reference-focus'), requests.scores);
  const pair_scores = name === 'scope-contrast' ? modes.flatMap((mode) => strategies.map((strategy) => ({ mode, strategy,
    passing_pairs: scopeContrasts.filter(({ id }) => [0, 1].every((repeat) => [1, 2].every((number) =>
      byKey.get(key({ repeat, strategy, mode, id: `${id}-${number}` })).precise_correct))).map(({ id }) => id),
  }))) : undefined;
  const outcome = ({ correct, precise_correct, actual_sources }) => ({ correct, precise_correct, actual_sources });
  const changes = strategies.slice(1).map((strategy) => ({ strategy, cases: [...cases.keys()].flatMap((id) => {
    const before = byKey.get(key({ repeat: 0, mode: 'excerpts', strategy: 'reference-focus', id }));
    const after = byKey.get(key({ repeat: 0, mode: 'excerpts', strategy, id }));
    assert(before && after);
    for (const mode of modes) for (const repeat of [0, 1]) {
      const old = byKey.get(key({ repeat, mode, strategy: 'reference-focus', id }));
      const current = byKey.get(key({ repeat, mode, strategy, id }));
      assert.deepEqual(outcome(before), outcome(old));
      assert.deepEqual(outcome(after), outcome(current));
      assert.deepEqual(stable(current), { ...stable(byKey.get(key({ repeat: 0, mode, strategy, id }))), repeat });
    }
    return before.precise_correct && after.precise_correct ? [] : [{ id, before: outcome(before), after: outcome(after) }];
  }) }));
  if (name === 'scope-contrast' || name === 'scope-request') evidence.push(...requests.rows.filter(({ repeat }) => repeat === 0).map((row) => ({ corpus: name, ...stable(row) })));
  record.corpora[name] = { fixture_sha256: protocol.fixture_sha256, artifacts: protocol.artifacts,
    parity_rows: previous ? previousRows : null, candidate_rows: requests.rows.length, report_sha256: reportDigest(requests),
    previous_applicability_query_terms: requests.previous_applicability_query_terms, scores, pair_scores, changes };
}

const jsonl = evidence.map((row) => JSON.stringify(row)).join('\n') + '\n';
record.evidence_sha256 = sha(jsonl);
if (action === '--record') {
  await writeFile(join(root, 'run.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  await writeFile(join(root, 'request-evidence.jsonl'), jsonl, { flag: 'wx' });
} else {
  assert.deepEqual(JSON.parse(JSON.stringify(record)), await json(join(root, 'run.json')));
  assert.equal(jsonl, await readFile(join(root, 'request-evidence.jsonl'), 'utf8'));
}
console.log(`Verified ${Object.values(record.corpora).reduce((sum, corpus) => sum + corpus.candidate_rows, 0)} candidate rows, ${evidence.length} verbatim rows, and all prior corpus commitments.`);
