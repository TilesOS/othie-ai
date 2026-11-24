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
  'Usage: node verify-evidence.mjs <six-corpus directory> [--record <verified November 22 run directory>]');
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const sha = (text) => createHash('sha256').update(text).digest('hex');
const digest = (value) => sha(JSON.stringify(value));
const stable = ({ component_wall_ms, ...row }) => row;
const reportDigest = (report) => digest({ ...report, rows: report.rows.map(stable) });
const modes = ['excerpts', 'rules_only'];
const repeats = [0, 1];
const strategies = ['request-union', 'request-specific', 'request-subject'];
const archivedRequests = join(root, '../../2026-11-22/request-followup');
const prior = await json(join(archivedRequests, 'run.json'));
const files = ['results.json', 'summary.json', 'assertion-candidates.json', 'reference-candidates.json', 'request-candidates.json'];

async function previousDigests(folder) {
  const reports = await Promise.all(files.map((file) => json(join(folder, file))));
  return Object.fromEntries(reports.map((report, index) => [files[index],
    index === 0 ? digest(report.map(stable)) : index === 1 ? digest(report) : reportDigest(report)]));
}

const expected = action ? null : await json(join(root, 'run.json'));
if (previousRun) execFileSync(process.execPath, [join(archivedRequests, 'verify-evidence.mjs'), previousRun], { stdio: 'inherit' });
const previous = previousRun ? Object.fromEntries(await Promise.all(Object.keys(prior.corpora).map(async (corpus) =>
  [corpus, await previousDigests(resolve(previousRun, corpus))]))) : expected.previous_report_hashes;
const record = { fixture_revision: '7c4af2e', source_revision: '8976e5e', previous_report_hashes: previous, corpora: {} };
const evidence = [];

for (const corpus of [...Object.keys(prior.corpora), 'scope-subject']) {
  const folder = resolve(directory, corpus);
  const [protocol, rows, assertion, reference, requests, subject] = await Promise.all([
    'protocol.json', files[0], files[2], files[3], files[4], 'subject-candidates.json',
  ].map((file) => json(join(folder, file))));
  assert.equal(protocol.corpus, corpus);
  assert.equal(protocol.repeats, repeats.length);
  assert.equal(protocol.fixture_sha256, digest({ documents: protocol.documents, cases: protocol.cases }));
  const old = prior.corpora[corpus];
  if (old) {
    assert.equal(protocol.fixture_sha256, old.fixture_sha256);
    assert.equal(reportDigest(requests), old.report_sha256);
    assert.deepEqual(await previousDigests(folder), previous[corpus]);
  }

  const cases = new Map(protocol.cases.map((scenario) => [scenario.id, scenario]));
  const documents = new Map(protocol.documents.map(({ name, text }) => [name, text]));
  const key = ({ repeat, strategy, mode, id }) => `${repeat}/${strategy}/${mode}/${id}`;
  const byKey = new Map([...requests.rows, ...subject.rows].map((row) => [key(row), row]));
  assert.equal(byKey.size, cases.size * modes.length * repeats.length * strategies.length);
  assert.equal(subject.rows.length, cases.size * modes.length * repeats.length);
  for (const row of subject.rows) {
    const scenario = cases.get(row.id);
    assert.equal(row.strategy, 'request-subject');
    assert.equal(row.query, row.terms.join(' ') || '?');
    assert.deepEqual(row.expected_sources, scenario.sources);
    const { clauses, terms, assertions, admitted } = row;
    assert.deepEqual({ clauses, terms, assertions, admitted }, subjectAdmission(scenario.query, protocol.documents));
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

  const all = [...requests.rows, ...subject.rows];
  const scores = modes.flatMap((mode) => strategies.map((strategy) => ({ mode, strategy,
    ...queryScopeScores(all.filter((row) => row.mode === mode && row.strategy === strategy)) })));
  assert.deepEqual(scores.filter(({ strategy }) => strategy === 'request-subject'), subject.scores);
  const pair_scores = corpus === 'scope-contrast' ? modes.flatMap((mode) => strategies.map((strategy) => ({ mode, strategy,
    passing_pairs: scopeContrasts.filter(({ id }) => repeats.every((repeat) => [1, 2].every((variant) =>
      byKey.get(key({ repeat, strategy, mode, id: `${id}-${variant}` })).precise_correct))).map(({ id }) => id),
  }))) : undefined;
  const outcome = ({ correct, precise_correct, actual_sources }) => ({ correct, precise_correct, actual_sources });
  const changes = [...cases.keys()].flatMap((id) => {
    const before = outcome(byKey.get(key({ repeat: 0, mode: 'excerpts', strategy: 'request-specific', id })));
    const after = outcome(byKey.get(key({ repeat: 0, mode: 'excerpts', strategy: 'request-subject', id })));
    for (const mode of modes) for (const repeat of repeats) {
      assert.deepEqual(outcome(byKey.get(key({ repeat, mode, strategy: 'request-specific', id }))), before);
      assert.deepEqual(outcome(byKey.get(key({ repeat, mode, strategy: 'request-subject', id }))), after);
    }
    return before.precise_correct && after.precise_correct ? [] : [{ id, before, after }];
  });
  if (corpus === 'scope-contrast' || corpus === 'scope-subject') {
    evidence.push(...subject.rows.filter(({ repeat }) => repeat === 0).map((row) => ({ corpus, ...stable(row) })));
  }
  record.corpora[corpus] = { fixture_sha256: protocol.fixture_sha256, artifacts: protocol.artifacts,
    previous_rows: old ? { baseline: rows.length, assertion: assertion.rows.length, reference: reference.rows.length, request: requests.rows.length } : null,
    candidate_rows: subject.rows.length, report_sha256: reportDigest(subject), scores, pair_scores, changes };
}

const jsonl = evidence.map((row) => JSON.stringify(row)).join('\n') + '\n';
record.evidence_sha256 = sha(jsonl);
if (action) {
  await writeFile(join(root, 'run.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  await writeFile(join(root, 'subject-evidence.jsonl'), jsonl, { flag: 'wx' });
} else {
  assert.deepEqual(JSON.parse(JSON.stringify(record)), expected);
  assert.equal(jsonl, await readFile(join(root, 'subject-evidence.jsonl'), 'utf8'));
}
const candidateRows = Object.values(record.corpora).reduce((sum, { candidate_rows }) => sum + candidate_rows, 0);
console.log(`Verified ${candidateRows} candidate rows, ${evidence.length} verbatim rows, and all five prior corpus replays.`);
