import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { queryScopeScores } from '../../../../dist/src/evaluation/query-scope-metrics.js';
import { scoreQueryScope } from '../../../../dist/src/evaluation/query-scope.js';
import { scopeContrasts } from '../../../../dist/src/evaluation/scope-contrast-cases.js';
import { subjectAdmission } from '../../../../dist/src/evaluation/scope-subject.js';
import { countTokens } from '../../../../dist/src/tokenizer.js';

const root = dirname(fileURLToPath(import.meta.url));
const [directory, action, previousRun, ...extra] = process.argv.slice(2);
assert(directory && (!action || action === '--record' && previousRun) && !extra.length,
  'Usage: node verify-evidence.mjs <eight-corpus directory> [--record <verified November 24 run directory>]');
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const sha = (text) => createHash('sha256').update(text).digest('hex');
const digest = (value) => sha(JSON.stringify(value));
const stable = ({ component_wall_ms, ...row }) => row;
const reportDigest = (report) => digest({ ...report, rows: report.rows.map(stable) });
const modes = ['excerpts', 'rules_only'];
const repeats = [0, 1];
const strategies = ['request-position', 'request-action'];
const files = ['results.json', 'summary.json', 'assertion-candidates.json', 'reference-candidates.json',
  'request-candidates.json', 'subject-candidates.json', 'position-candidates.json'];
const prior = await json(join(root, '../../2026-11-24/position-followup/run.json'));
const expected = action ? null : await json(join(root, 'run.json'));

const loadReports = (folder) => Promise.all(files.map((file) => json(join(folder, file))));
const digests = (reports) => Object.fromEntries(reports.map((report, index) => [files[index],
  index === 0 ? digest(report.map(stable)) : index === 1 ? digest(report) : reportDigest(report)]));

const record = { fixture_revision: '4cc6641', source_revision: '8e4df23', corpora: {} };
const evidence = [];
for (const corpus of [...Object.keys(prior.corpora), 'scope-action']) {
  const folder = resolve(directory, corpus);
  const [protocol, baselineReports, candidate] = await Promise.all([
    json(join(folder, 'protocol.json')), loadReports(folder), json(join(folder, 'action-candidates.json')),
  ]);
  assert.equal(protocol.corpus, corpus);
  assert.equal(protocol.repeats, repeats.length);
  assert.equal(protocol.fixture_sha256, digest({ documents: protocol.documents, cases: protocol.cases }));
  assert.equal(candidate.protocol, 'scope-action-v1');
  const [baseline, , assertion, reference, requests, subject, position] = baselineReports;
  const reportHashes = digests(baselineReports);
  const archived = prior.corpora[corpus];
  if (archived) {
    assert.equal(protocol.fixture_sha256, archived.fixture_sha256);
    assert.equal(reportHashes['position-candidates.json'], archived.report_sha256);
    if (archived.prior_report_hashes) for (const [file, hash] of Object.entries(archived.prior_report_hashes)) {
      assert.equal(reportHashes[file], hash, `${corpus}/${file}`);
    }
    assert.deepEqual(reportHashes, action ? digests(await loadReports(resolve(previousRun, corpus))) : expected.corpora[corpus].prior_report_hashes);
  }

  const cases = new Map(protocol.cases.map((scenario) => [scenario.id, scenario]));
  const documents = new Map(protocol.documents.map(({ name, text }) => [name, text]));
  const key = ({ repeat, strategy, mode, id }) => `${repeat}/${strategy}/${mode}/${id}`;
  const all = [...position.rows, ...candidate.rows];
  const byKey = new Map(all.map((row) => [key(row), row]));
  assert.equal(byKey.size, cases.size * modes.length * repeats.length * strategies.length);
  assert.equal(candidate.rows.length, cases.size * modes.length * repeats.length);
  for (const row of candidate.rows) {
    const scenario = cases.get(row.id);
    assert.equal(row.strategy, 'request-action');
    assert.equal(row.query, row.terms.join(' ') || '?');
    assert.deepEqual(row.expected_sources, scenario.sources);
    const { clauses, terms, assertions, admitted } = row;
    assert.deepEqual({ clauses, terms, assertions, admitted }, subjectAdmission(scenario.query, protocol.documents, 'action'));
    assert.deepEqual(row.actual_sources, row.prepack_sources);
    assert(row.actual_sources.every((source) => admitted.includes(source)));
    for (const { source, quote } of row.evidence) {
      assert.equal(source, `s1/${basename(source)}`);
      assert(quote.trim() && documents.get(basename(source)).includes(quote));
      assert(row.text.includes(`<citation source="${source}" at="lines 1-1"/>`));
    }
    for (const clause of clauses) for (const binding of clause.action_bindings ?? []) {
      for (const { source, text } of binding.assertions) assert(text.trim() && documents.get(source).includes(text));
    }
    const tokens = countTokens(row.text, 'o200k_base');
    assert(tokens <= 500 && row.citations_exact && row.cap_passed);
    assert.equal(Number(/ tokens="(\d+)"/.exec(row.text)?.[1]), tokens);
    for (const [field, value] of Object.entries(scoreQueryScope(scenario, row.evidence, protocol.documents))) {
      assert.deepEqual(row[field], value);
    }
    assert.deepEqual(stable(row), { ...stable(byKey.get(key({ ...row, repeat: 0 }))), repeat: row.repeat });
  }

  const scores = modes.flatMap((mode) => strategies.map((strategy) => ({ mode, strategy,
    ...queryScopeScores(all.filter((row) => row.mode === mode && row.strategy === strategy)) })));
  assert.deepEqual(scores.filter(({ strategy }) => strategy === 'request-action'), candidate.scores);
  const pair_scores = corpus === 'scope-contrast' ? modes.flatMap((mode) => strategies.map((strategy) => ({ mode, strategy,
    passing_pairs: scopeContrasts.filter(({ id }) => repeats.every((repeat) => [1, 2].every((variant) =>
      byKey.get(key({ repeat, strategy, mode, id: `${id}-${variant}` })).precise_correct))).map(({ id }) => id),
  }))) : undefined;
  const outcome = ({ correct, precise_correct, actual_sources }) => ({ correct, precise_correct, actual_sources });
  const changes = [...cases.keys()].flatMap((id) => {
    const before = outcome(byKey.get(key({ repeat: 0, mode: 'excerpts', strategy: 'request-position', id })));
    const after = outcome(byKey.get(key({ repeat: 0, mode: 'excerpts', strategy: 'request-action', id })));
    for (const mode of modes) for (const repeat of repeats) {
      assert.deepEqual(outcome(byKey.get(key({ repeat, mode, strategy: 'request-position', id }))), before);
      assert.deepEqual(outcome(byKey.get(key({ repeat, mode, strategy: 'request-action', id }))), after);
    }
    return before.precise_correct && after.precise_correct && digest(before) === digest(after) ? [] : [{ id, before, after }];
  });
  const changedIds = new Set(changes.map(({ id }) => id));
  evidence.push(...candidate.rows.filter(({ repeat, id }) => repeat === 0 && (corpus === 'scope-action' || changedIds.has(id)))
    .map((row) => ({ corpus, ...stable(row) })));
  record.corpora[corpus] = { fixture_sha256: protocol.fixture_sha256, artifacts: protocol.artifacts,
    prior_report_hashes: reportHashes,
    prior_rows: { baseline: baseline.length, assertion: assertion.rows.length, reference: reference.rows.length,
      request: requests.rows.length, subject: subject.rows.length, position: position.rows.length },
    candidate_rows: candidate.rows.length, report_sha256: reportDigest(candidate), scores, pair_scores, changes };
}

const jsonl = evidence.map((row) => JSON.stringify(row)).join('\n') + '\n';
record.evidence_sha256 = sha(jsonl);
if (action) {
  await writeFile(join(root, 'run.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  await writeFile(join(root, 'action-evidence.jsonl'), jsonl, { flag: 'wx' });
} else {
  assert.deepEqual(JSON.parse(JSON.stringify(record)), expected);
  assert.equal(jsonl, await readFile(join(root, 'action-evidence.jsonl'), 'utf8'));
}
const candidateRows = Object.values(record.corpora).reduce((sum, { candidate_rows }) => sum + candidate_rows, 0);
const probes = await json(join(root, 'checks/admission-probes.json'));
assert.equal(probes.protocol, 'scope-action-admission-probes-v1');
for (const row of probes.rows) {
  assert.deepEqual(subjectAdmission(row.query, probes.documents, true).admitted.sort(), row.position_sources, row.id);
  assert.deepEqual(subjectAdmission(row.query, probes.documents, 'action').admitted.sort(), row.action_sources, row.id);
}
console.log(`Verified ${candidateRows} candidate rows, ${evidence.length} verbatim rows, seven prior corpus replays, and ${probes.rows.length} follow-up probes.`);
