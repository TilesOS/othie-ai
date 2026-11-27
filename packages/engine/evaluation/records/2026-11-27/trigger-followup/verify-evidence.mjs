import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { queryScopeScores } from '../../../../dist/src/evaluation/query-scope-metrics.js';
import { scoreQueryScope } from '../../../../dist/src/evaluation/query-scope.js';
import { scopeContrasts } from '../../../../dist/src/evaluation/scope-contrast-cases.js';
import { scopeTriggerCases, scopeTriggerDocuments } from '../../../../dist/src/evaluation/scope-trigger-cases.js';
import { subjectAdmission } from '../../../../dist/src/evaluation/scope-subject.js';
import { countTokens } from '../../../../dist/src/tokenizer.js';

const root = dirname(fileURLToPath(import.meta.url));
const [directory, flag, ...extra] = process.argv.slice(2);
assert(directory && (!flag || flag === '--record') && !extra.length,
  'Usage: node verify-evidence.mjs <ten-corpus directory> [--record]');
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const sha = (value) => createHash('sha256').update(value).digest('hex');
const digest = (value) => sha(JSON.stringify(value));
const stable = ({ component_wall_ms, ...row }) => row;
const reportDigest = (report) => digest({ ...report, rows: report.rows.map(stable) });
const modes = ['excerpts', 'rules_only'];
const repeats = [0, 1];
const strategies = ['request-predicate', 'request-trigger'];
const priorFolder = join(root, '../../2026-11-26/predicate-followup');
const prior = await json(join(priorFolder, 'run.json'));
const files = [...Object.keys(prior.corpora['scope-predicate'].prior_report_hashes), 'predicate-candidates.json'];
const priorProbes = await json(join(priorFolder, 'checks/admission-probes.json'));
const followUp = await json(join(root, 'checks/admission-probes.json'));
const record = { fixture_revision: '25eab40', source_revision: '204d1f9', corpora: {} };
const evidence = [];

assert.deepEqual(scopeTriggerDocuments.slice(0, priorProbes.documents.length), priorProbes.documents);
for (const probe of priorProbes.rows) {
  const frozen = scopeTriggerCases.find((scenario) => scenario.id === probe.id);
  assert.equal(frozen?.query, probe.query);
  assert.deepEqual(frozen.sources, probe.expected_sources);
  const archived = prior.follow_up.find(({ id }) => id === probe.id);
  assert.deepEqual(subjectAdmission(frozen.query, priorProbes.documents, 'predicate').admitted.sort(), archived.predicate_sources);
}

for (const corpus of [...Object.keys(prior.corpora), 'scope-trigger']) {
  const folder = resolve(directory, corpus);
  const archived = prior.corpora[corpus];
  const [protocol, candidate, reports] = await Promise.all([
    json(join(folder, 'protocol.json')), json(join(folder, 'trigger-candidates.json')),
    Promise.all(files.map((file) => json(join(folder, file)))),
  ]);
  assert.equal(protocol.corpus, corpus);
  assert.equal(protocol.repeats, repeats.length);
  assert.equal(protocol.fixture_sha256, digest({ documents: protocol.documents, cases: protocol.cases }));
  assert.equal(candidate.protocol, 'scope-trigger-v1');
  const hashes = Object.fromEntries(files.map((file, index) => [file,
    file === 'results.json' ? digest(reports[index].map(stable))
      : file === 'summary.json' ? digest(reports[index]) : reportDigest(reports[index])]));
  if (archived) {
    assert.equal(protocol.fixture_sha256, archived.fixture_sha256);
    assert.deepEqual(hashes, { ...archived.prior_report_hashes, 'predicate-candidates.json': archived.report_sha256 }, corpus);
  }

  const cases = new Map(protocol.cases.map((scenario) => [scenario.id, scenario]));
  const documents = new Map(protocol.documents.map(({ name, text }) => [name, text]));
  const key = ({ repeat, strategy, mode, id }) => [repeat, strategy, mode, id].join('/');
  const all = [...reports.at(-1).rows, ...candidate.rows];
  const byKey = new Map(all.map((row) => [key(row), row]));
  assert.equal(candidate.rows.length, cases.size * modes.length * repeats.length);
  assert.equal(byKey.size, candidate.rows.length * strategies.length);
  assert.equal(byKey.size, all.length);
  for (const row of candidate.rows) {
    const scenario = cases.get(row.id);
    assert.equal(row.strategy, 'request-trigger');
    assert.deepEqual(row.expected_sources, scenario.sources);
    const { clauses, terms, assertions, admitted } = row;
    assert.deepEqual({ clauses, terms, assertions, admitted }, subjectAdmission(scenario.query, protocol.documents, 'trigger'));
    assert.deepEqual(row.actual_sources, row.prepack_sources);
    assert(row.actual_sources.every((source) => admitted.includes(source)));
    for (const { source, quote } of row.evidence) {
      assert.equal(source, 's1/' + basename(source));
      assert(quote.trim() && documents.get(basename(source)).includes(quote));
      assert(row.text.includes('<citation source="' + source + '" at="lines 1-1"/>'));
    }
    for (const clause of clauses) for (const binding of clause.action_bindings ?? []) {
      for (const { source, text } of [...binding.assertions, ...(binding.trigger_candidates ?? [])]) {
        assert(text.trim() && documents.get(source).includes(text));
      }
    }
    const tokens = countTokens(row.text, 'o200k_base');
    assert(tokens <= 500 && row.citations_exact && row.cap_passed);
    assert.equal(Number(/ tokens="(\d+)"/.exec(row.text)?.[1]), tokens);
    assert.equal(row.query, terms.join(' ') || '?');
    for (const [field, value] of Object.entries(scoreQueryScope(scenario, row.evidence, protocol.documents))) {
      assert.deepEqual(row[field], value);
    }
    assert.deepEqual(stable(row), { ...stable(byKey.get(key({ ...row, repeat: 0 }))), repeat: row.repeat });
  }

  const scores = modes.flatMap((mode) => strategies.map((strategy) => ({ mode, strategy,
    ...queryScopeScores(all.filter((row) => row.mode === mode && row.strategy === strategy)) })));
  assert.deepEqual(scores.filter(({ strategy }) => strategy === 'request-trigger'), candidate.scores);
  const pair_scores = corpus === 'scope-contrast' ? modes.flatMap((mode) => strategies.map((strategy) => ({ mode, strategy,
    passing_pairs: scopeContrasts.filter(({ id }) => repeats.every((repeat) => [1, 2].every((index) =>
      byKey.get(key({ repeat, strategy, mode, id: id + '-' + index })).precise_correct))).map(({ id }) => id),
  }))) : undefined;
  const outcome = ({ precise_correct, actual_sources }) => ({ precise_correct, actual_sources });
  const changes = [...cases.keys()].flatMap((id) => {
    const outcomes = strategies.map((strategy) => {
      const first = outcome(byKey.get(key({ repeat: 0, mode: 'excerpts', strategy, id })));
      for (const repeat of repeats) for (const mode of modes) {
        assert.deepEqual(outcome(byKey.get(key({ repeat, mode, strategy, id }))), first);
      }
      return first;
    });
    const [before, after] = outcomes;
    return before.precise_correct && after.precise_correct && digest(before) === digest(after) ? [] : [{ id, before, after }];
  });
  const changed = new Set(changes.map(({ id }) => id));
  evidence.push(...candidate.rows.filter(({ repeat, id }) => repeat === 0 && (!archived || changed.has(id)))
    .map((row) => ({ corpus, ...stable(row) })));
  record.corpora[corpus] = { fixture_sha256: protocol.fixture_sha256, artifacts: protocol.artifacts,
    prior_report_hashes: hashes, prior_rows: Object.fromEntries(files.flatMap((file, index) => {
      if (file === 'summary.json') return [];
      const report = reports[index];
      return [[file, Array.isArray(report) ? report.length : report.rows.length]];
    })), candidate_rows: candidate.rows.length, report_sha256: reportDigest(candidate), scores, pair_scores, changes };
}

assert.equal(followUp.protocol, 'scope-trigger-admission-probes-v1');
record.follow_up = followUp.rows.map(({ id, query, expected_sources }) => {
  const outcomes = ['predicate', 'trigger'].map((arm) => subjectAdmission(query, followUp.documents, arm).admitted.sort());
  return { id, expected_sources, predicate_sources: outcomes[0], trigger_sources: outcomes[1] };
});
const jsonl = evidence.map((row) => JSON.stringify(row)).join('\n') + '\n';
record.evidence_sha256 = sha(jsonl);
const serialized = JSON.stringify(record, null, 2) + '\n';
if (flag) {
  await writeFile(join(root, 'run.json'), serialized, { flag: 'wx' });
  await writeFile(join(root, 'trigger-evidence.jsonl'), jsonl, { flag: 'wx' });
} else {
  assert.equal(serialized, await readFile(join(root, 'run.json'), 'utf8'));
  assert.equal(jsonl, await readFile(join(root, 'trigger-evidence.jsonl'), 'utf8'));
}
const count = Object.values(record.corpora).reduce((sum, { candidate_rows }) => sum + candidate_rows, 0);
console.log('Verified ' + count + ' candidate rows, ' + evidence.length + ' verbatim rows, nine prior corpus replays, and '
  + followUp.rows.length + ' follow-up probes.');
