import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { queryScopeScores } from "../../../../dist/src/evaluation/query-scope-metrics.js";
import { scoreQueryScope } from "../../../../dist/src/evaluation/query-scope.js";
import { scopeContrasts } from "../../../../dist/src/evaluation/scope-contrast-cases.js";
import { scopeEventCases, scopeEventDocuments } from "../../../../dist/src/evaluation/scope-event-cases.js";
import { subjectAdmission } from "../../../../dist/src/evaluation/scope-subject.js";
import { countTokens } from "../../../../dist/src/tokenizer.js";

const root = dirname(fileURLToPath(import.meta.url));
const [directory, flag, ...extra] = process.argv.slice(2);
assert(directory && (!flag || flag === "--record") && !extra.length,
  "Usage: node verify-evidence.mjs <eleven-corpus directory> [--record]");
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const digest = (value) => sha(JSON.stringify(value));
const stable = ({ component_wall_ms, ...row }) => row;
const hashReport = (report) => digest({ ...report, rows: report.rows.map(stable) });
const key = ({ repeat, strategy, mode, id }) => [repeat, strategy, mode, id].join("/");
const modes = ["excerpts", "rules_only"];
const repeats = [0, 1];
const strategies = ["request-trigger", "request-event"];
const priorFolder = join(root, "../trigger-followup");
const prior = await json(join(priorFolder, "run.json"));
const priorProbes = await json(join(priorFolder, "checks/admission-probes.json"));
const probes = await json(join(root, "checks/admission-probes.json"));
const record = { fixture_revision: "22cedc6", source_revision: "34cb2e5", corpora: {} };
const evidence = [];

assert.deepEqual(scopeEventDocuments.slice(0, priorProbes.documents.length), priorProbes.documents);
for (const { id, query, expected_sources } of priorProbes.rows) {
  const frozen = scopeEventCases.find((scenario) => scenario.id === id);
  assert.equal(frozen?.query, query);
  assert.deepEqual(frozen.sources, expected_sources);
  assert.deepEqual(subjectAdmission(query, priorProbes.documents, "trigger").admitted.sort(),
    prior.follow_up.find((row) => row.id === id).trigger_sources);
}

for (const corpus of [...Object.keys(prior.corpora), "scope-event"]) {
  const folder = resolve(directory, corpus);
  const archived = prior.corpora[corpus];
  const files = Object.keys(prior.corpora["scope-trigger"].prior_report_hashes);
  const [protocol, event, trigger, reports] = await Promise.all([
    json(join(folder, "protocol.json")), json(join(folder, "event-candidates.json")),
    json(join(folder, "trigger-candidates.json")), Promise.all(files.map((file) => json(join(folder, file)))),
  ]);
  assert.equal(protocol.corpus, corpus);
  assert.equal(protocol.repeats, repeats.length);
  assert.equal(protocol.fixture_sha256, digest({ documents: protocol.documents, cases: protocol.cases }));
  assert.equal(event.protocol, "scope-event-v1");
  const hashes = Object.fromEntries(files.map((file, index) => [file, file === "results.json"
    ? digest(reports[index].map(stable)) : file === "summary.json" ? digest(reports[index]) : hashReport(reports[index])]));
  hashes["trigger-candidates.json"] = hashReport(trigger);
  if (archived) {
    assert.equal(protocol.fixture_sha256, archived.fixture_sha256);
    assert.deepEqual(hashes, { ...archived.prior_report_hashes, "trigger-candidates.json": archived.report_sha256 }, corpus);
  }

  const cases = new Map(protocol.cases.map((scenario) => [scenario.id, scenario]));
  const sources = new Map(protocol.documents.map(({ name, text }) => [name, text]));
  const all = [...trigger.rows, ...event.rows];
  const byKey = new Map(all.map((row) => [key(row), row]));
  assert.equal(event.rows.length, cases.size * modes.length * repeats.length);
  assert.equal(byKey.size, event.rows.length * strategies.length);
  assert.equal(byKey.size, all.length);
  for (const row of event.rows) {
    const scenario = cases.get(row.id);
    assert.equal(row.strategy, "request-event");
    assert.deepEqual(row.expected_sources, scenario.sources);
    const { clauses, terms, assertions, admitted } = row;
    assert.deepEqual({ clauses, terms, assertions, admitted }, subjectAdmission(scenario.query, protocol.documents, "event"));
    assert.deepEqual(row.actual_sources, row.prepack_sources);
    assert(row.actual_sources.every((source) => admitted.includes(source)));
    for (const { source, quote } of row.evidence) {
      assert.equal(source, "s1/" + basename(source));
      assert(quote.trim() && sources.get(basename(source)).includes(quote));
      assert(row.text.includes('<citation source="' + source + '" at="lines 1-1"/>'));
    }
    for (const clause of clauses) for (const binding of clause.action_bindings ?? []) {
      for (const { source, text, antecedents } of [...binding.assertions, ...(binding.trigger_candidates ?? [])]) {
        const original = sources.get(source);
        assert(text.trim() && original.includes(text));
        for (const antecedent of antecedents ?? []) {
          assert(antecedent.text.trim() && original.indexOf(antecedent.text) >= 0);
          assert(original.indexOf(antecedent.text) < original.lastIndexOf(text));
        }
      }
    }
    const tokens = countTokens(row.text, "o200k_base");
    assert(tokens <= 500 && row.citations_exact && row.cap_passed);
    assert.equal(Number(/ tokens="(\d+)"/.exec(row.text)?.[1]), tokens);
    assert.equal(row.query, terms.join(" ") || "?");
    for (const [field, value] of Object.entries(scoreQueryScope(scenario, row.evidence, protocol.documents))) {
      assert.deepEqual(row[field], value);
    }
    assert.deepEqual(stable(row), { ...stable(byKey.get(key({ ...row, repeat: 0 }))), repeat: row.repeat });
  }

  const scores = modes.flatMap((mode) => strategies.map((strategy) => ({ mode, strategy,
    ...queryScopeScores(all.filter((row) => row.mode === mode && row.strategy === strategy)) })));
  assert.deepEqual(scores.filter(({ strategy }) => strategy === "request-event"), event.scores);
  const pair_scores = corpus === "scope-contrast" ? modes.flatMap((mode) => strategies.map((strategy) => ({ mode, strategy,
    passing_pairs: scopeContrasts.filter(({ id }) => repeats.every((repeat) => [1, 2].every((index) =>
      byKey.get(key({ repeat, strategy, mode, id: id + "-" + index })).precise_correct))).map(({ id }) => id),
  }))) : undefined;
  const outcome = ({ precise_correct, actual_sources }) => ({ precise_correct, actual_sources });
  const changes = [...cases.keys()].flatMap((id) => {
    const outcomes = strategies.map((strategy) => {
      const first = outcome(byKey.get(key({ repeat: 0, mode: "excerpts", strategy, id })));
      for (const repeat of repeats) for (const mode of modes) {
        assert.deepEqual(outcome(byKey.get(key({ repeat, mode, strategy, id }))), first);
      }
      return first;
    });
    const [before, after] = outcomes;
    return before.precise_correct && after.precise_correct ? [] : [{ id, before, after }];
  });
  const changed = new Set(changes.map(({ id }) => id));
  evidence.push(...event.rows.filter(({ repeat, id }) => repeat === 0 && (!archived || changed.has(id)))
    .map((row) => ({ corpus, ...stable(row) })));
  record.corpora[corpus] = { fixture_sha256: protocol.fixture_sha256, artifacts: protocol.artifacts,
    prior_report_hashes: hashes, candidate_rows: event.rows.length, report_sha256: hashReport(event), scores, pair_scores, changes };
}

assert.equal(probes.protocol, "scope-event-admission-probes-v1");
record.follow_up = probes.rows.map(({ id, query, expected_sources }) => ({
  id, expected_sources, trigger_sources: subjectAdmission(query, probes.documents, "trigger").admitted.sort(),
  event_sources: subjectAdmission(query, probes.documents, "event").admitted.sort(),
}));
const jsonl = evidence.map((row) => JSON.stringify(row)).join("\n") + "\n";
record.evidence_sha256 = sha(jsonl);
const serialized = JSON.stringify(record, null, 2) + "\n";
if (flag) {
  await writeFile(join(root, "run.json"), serialized, { flag: "wx" });
  await writeFile(join(root, "event-evidence.jsonl"), jsonl, { flag: "wx" });
} else {
  assert.equal(serialized, await readFile(join(root, "run.json"), "utf8"));
  assert.equal(jsonl, await readFile(join(root, "event-evidence.jsonl"), "utf8"));
}
const count = Object.values(record.corpora).reduce((sum, { candidate_rows }) => sum + candidate_rows, 0);
console.log("Verified %d candidate rows, %d verbatim rows, %d prior corpus replays, and %d later probes.",
  count, evidence.length, Object.keys(prior.corpora).length, probes.rows.length);
