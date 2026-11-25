import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
  'Usage: node verify-evidence.mjs <seven-corpus directory> [--record <verified November 23 run directory>]');
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const sha = (text) => createHash('sha256').update(text).digest('hex');
const digest = (value) => sha(JSON.stringify(value));
const stable = ({ component_wall_ms, ...row }) => row;
const reportDigest = (report) => digest({ ...report, rows: report.rows.map(stable) });
const modes = ['excerpts', 'rules_only'];
const repeats = [0, 1];
const strategies = ['request-subject', 'request-position'];
const files = ['results.json', 'summary.json', 'assertion-candidates.json', 'reference-candidates.json',
  'request-candidates.json', 'subject-candidates.json'];
const archived = join(root, '../../2026-11-23/subject-followup');
const prior = await json(join(archived, 'run.json'));
const expected = action ? null : await json(join(root, 'run.json'));

const loadReports = (folder) => Promise.all(files.map((file) => json(join(folder, file))));
const digests = (reports) => Object.fromEntries(reports.map((report, index) => [files[index],
  index === 0 ? digest(report.map(stable)) : index === 1 ? digest(report) : reportDigest(report)]));
if (action) execFileSync(process.execPath, [join(archived, 'verify-evidence.mjs'), previousRun], { stdio: 'inherit' });

const record = { fixture_revision: '0c69a80', source_revision: 'af1df88', corpora: {} };
const evidence = [];
for (const corpus of [...Object.keys(prior.corpora), 'scope-position']) {
  const folder = resolve(directory, corpus);
  const [protocol, baselineReports, candidate] = await Promise.all([
    json(join(folder, 'protocol.json')), loadReports(folder), json(join(folder, 'position-candidates.json')),
  ]);
  assert.equal(protocol.corpus, corpus);
  assert.equal(protocol.repeats, repeats.length);
  assert.equal(protocol.fixture_sha256, digest({ documents: protocol.documents, cases: protocol.cases }));
  assert.equal(candidate.protocol, 'scope-position-v1');
  const [baseline, , assertion, reference, requests, subject] = baselineReports;
  const reportHashes = digests(baselineReports);
  if (Object.hasOwn(prior.corpora, corpus)) {
    assert.equal(protocol.fixture_sha256, prior.corpora[corpus].fixture_sha256);
    assert.equal(reportHashes['subject-candidates.json'], prior.corpora[corpus].report_sha256);
    assert.deepEqual(reportHashes, action ? digests(await loadReports(resolve(previousRun, corpus))) : expected.corpora[corpus].prior_report_hashes);
  }

  const cases = new Map(protocol.cases.map((scenario) => [scenario.id, scenario]));
  const documents = new Map(protocol.documents.map(({ name, text }) => [name, text]));
  const key = ({ repeat, strategy, mode, id }) => `${repeat}/${strategy}/${mode}/${id}`;
  const all = [...subject.rows, ...candidate.rows];
  const byKey = new Map(all.map((row) => [key(row), row]));
  assert.equal(byKey.size, cases.size * modes.length * repeats.length * strategies.length);
  assert.equal(candidate.rows.length, cases.size * modes.length * repeats.length);
  for (const row of candidate.rows) {
    const scenario = cases.get(row.id);
    assert.equal(row.strategy, 'request-position');
    assert.equal(row.query, row.terms.join(' ') || '?');
    assert.deepEqual(row.expected_sources, scenario.sources);
    const { clauses, terms, assertions, admitted } = row;
    assert.deepEqual({ clauses, terms, assertions, admitted }, subjectAdmission(scenario.query, protocol.documents, true));
    assert.deepEqual(row.actual_sources, row.prepack_sources);
    assert(row.actual_sources.every((source) => admitted.includes(source)));
    for (const { source, quote } of row.evidence) {
      assert.equal(source, `s1/${basename(source)}`);
      assert(quote.trim() && documents.get(basename(source)).includes(quote));
      assert(row.text.includes(`<citation source="${source}" at="lines 1-1"/>`));
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
  assert.deepEqual(scores.filter(({ strategy }) => strategy === 'request-position'), candidate.scores);
  const pair_scores = corpus === 'scope-contrast' ? modes.flatMap((mode) => strategies.map((strategy) => ({ mode, strategy,
    passing_pairs: scopeContrasts.filter(({ id }) => repeats.every((repeat) => [1, 2].every((variant) =>
      byKey.get(key({ repeat, strategy, mode, id: `${id}-${variant}` })).precise_correct))).map(({ id }) => id),
  }))) : undefined;
  const outcome = ({ correct, precise_correct, actual_sources }) => ({ correct, precise_correct, actual_sources });
  const changes = [...cases.keys()].flatMap((id) => {
    const before = outcome(byKey.get(key({ repeat: 0, mode: 'excerpts', strategy: 'request-subject', id })));
    const after = outcome(byKey.get(key({ repeat: 0, mode: 'excerpts', strategy: 'request-position', id })));
    for (const mode of modes) for (const repeat of repeats) {
      assert.deepEqual(outcome(byKey.get(key({ repeat, mode, strategy: 'request-subject', id }))), before);
      assert.deepEqual(outcome(byKey.get(key({ repeat, mode, strategy: 'request-position', id }))), after);
    }
    return before.precise_correct && after.precise_correct ? [] : [{ id, before, after }];
  });
  const changedIds = new Set(changes.map(({ id }) => id));
  evidence.push(...candidate.rows.filter(({ repeat, id }) => repeat === 0 && (corpus === 'scope-position' || changedIds.has(id)))
    .map((row) => ({ corpus, ...stable(row) })));
  record.corpora[corpus] = { fixture_sha256: protocol.fixture_sha256, artifacts: protocol.artifacts,
    prior_report_hashes: reportHashes,
    prior_rows: { baseline: baseline.length, assertion: assertion.rows.length, reference: reference.rows.length,
      request: requests.rows.length, subject: subject.rows.length },
    candidate_rows: candidate.rows.length, report_sha256: reportDigest(candidate), scores, pair_scores, changes };
}

const jsonl = evidence.map((row) => JSON.stringify(row)).join('\n') + '\n';
record.evidence_sha256 = sha(jsonl);
if (action) {
  await writeFile(join(root, 'run.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  await writeFile(join(root, 'position-evidence.jsonl'), jsonl, { flag: 'wx' });
} else {
  assert.deepEqual(JSON.parse(JSON.stringify(record)), expected);
  assert.equal(jsonl, await readFile(join(root, 'position-evidence.jsonl'), 'utf8'));
}
const candidateRows = Object.values(record.corpora).reduce((sum, { candidate_rows }) => sum + candidate_rows, 0);
console.log(`Verified ${candidateRows} candidate rows, ${evidence.length} verbatim rows, and six prior corpus replays.`);
