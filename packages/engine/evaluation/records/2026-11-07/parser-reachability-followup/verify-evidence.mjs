import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, "../../../../../..");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const json = async name => JSON.parse(await readFile(join(root, name), "utf8"));
async function filesAt(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    assert(!entry.isSymbolicLink());
    if (entry.isDirectory()) files.push(...await filesAt(path));
    else { assert(entry.isFile()); files.push(relative(root, path).replaceAll("\\", "/")); }
  }
  return files.sort();
}
const manifest = await json("manifest.json");
assert.deepEqual((await filesAt(root)).filter(path => path !== "manifest.json"), manifest.files.map(row => row.path).sort());
for (const row of manifest.files) {
  const bytes = await readFile(join(root, row.path));
  assert.equal(bytes.length, row.bytes, row.path);
  assert.equal(sha(bytes), row.sha256, row.path);
  if (/\.(?:json|txt|md)$/.test(row.path)) assert(!/\/Users\/|\/private\/var\/folders\/|access_token|refresh_token|account_rate_limits/.test(bytes.toString()), row.path);
}
const sources = await json("checks/source-hashes.json");
const report = await json("checks/reachability.json");
for (const [path, hash] of Object.entries({ ...sources, ...report.source_hashes })) {
  assert.equal(sha(await readFile(join(repository, path))), hash, path);
  if (sources[path] && report.source_hashes[path]) assert.equal(sources[path], report.source_hashes[path]);
}
assert.equal(report.protocol, "parser-minimatch-reachability-v1");
assert.equal(report.node, "v24.18.0");
assert.equal(report.platform, "darwin");
assert.equal(report.parser_version, "8.70.0");
assert.equal(report.minimatch_version, "10.2.6");
const emptyTrace = { matches: [], preprocess: [], first_phase: [], second_phase: [] };
assert.equal(report.website.length, 2);
assert.deepEqual(report.website.map(row => row.file), ["lib/reachability-fixture.tsx", "lib/reachability-fixture.js"]);
for (const row of report.website) {
  assert.equal(row.project, null);
  assert.equal(row.project_service, null);
  assert.equal(row.fatal_errors, 0);
  assert.deepEqual(row.messages, []);
  assert.deepEqual(row.trace, emptyTrace);
}
const { parserGlobCases } = await import(pathToFileURL(join(repository, "apps/website/lib/lint-parser-fixtures.ts")));
assert.equal(parserGlobCases.length, 30);
assert.equal(report.parser.length, 33);
let matchCount = 0;
for (const [index, fixture] of parserGlobCases.entries()) {
  const row = report.parser[index];
  assert.equal(row.id, fixture.id);
  assert.equal(row.expected, fixture.expected);
  assert.equal(row.outcome, fixture.expected);
  assert.equal(row.type, fixture.expected === "typed" ? "number" : null);
  const shouldMatch = fixture.pattern !== null && fixture.expected !== "invalid-pattern";
  assert.equal(row.trace.matches.length, shouldMatch ? 1 : 0);
  assert.equal(row.trace.preprocess.length, shouldMatch ? 1 : 0);
  for (const call of row.trace.matches) {
    assert.equal(call.pattern, fixture.pattern);
    assert.deepEqual(call.options, { dot: true });
    matchCount++;
  }
  for (const call of row.trace.preprocess) assert.equal(call.optimization_level, 1);
  assert.deepEqual(row.trace.first_phase, []);
  assert.deepEqual(row.trace.second_phase, []);
}
assert.equal(matchCount, 26);
for (const [index, row] of report.parser.slice(30).entries()) {
  assert.equal(row.id, `amplification-pattern-${index}`);
  assert.equal(row.expected, "invalid-pattern");
  assert.equal(row.outcome, "invalid-pattern");
  assert.equal(row.type, null);
  assert.deepEqual(row.trace, emptyTrace);
}
assert.deepEqual(report.controls.map(row => row.requested_level), [null, 1, 2]);
for (const row of report.controls) {
  assert.deepEqual(row.trace.matches, []);
  assert.deepEqual(row.trace.preprocess, [{ optimization_level: row.requested_level ?? 1, input_parts: 1, output_parts: row.requested_level === 2 ? 2 : 1 }]);
  assert.equal(row.resulting_parts, row.requested_level === 2 ? 2 : 1);
  if (row.requested_level === 2) {
    assert.deepEqual(row.trace.first_phase, [{ optimization_level: 2, input_parts: 1, output_parts: 2 }]);
    assert.deepEqual(row.trace.second_phase, [{ optimization_level: 2, input_parts: 2, output_parts: 2 }]);
  } else {
    assert.deepEqual(row.trace.first_phase, []);
    assert.deepEqual(row.trace.second_phase, []);
  }
}
const initial = await json("checks/initial-reachability.json");
assert.equal(initial.controls[2].resulting_parts, 1);
assert.equal(initial.controls[2].trace.first_phase.length, 1);
assert.equal(initial.controls[2].trace.second_phase.length, 1);
assert((await readFile(join(root, "checks/initial-focused-test.txt"), "utf8")).includes("expected 1 to be greater than 1"));

const lock = JSON.parse(await readFile(join(repository, "package-lock.json"), "utf8"));
const consumers = await json("checks/consumers.json");
assert.equal(consumers.length, 7);
assert.deepEqual(consumers.map(row => row.consumer), Object.entries(lock.packages).filter(([, pkg]) => pkg.dependencies?.minimatch).map(([path]) => path));
for (const row of consumers) {
  const metadata = lock.packages[row.consumer];
  assert.equal(row.version, metadata.version);
  assert.equal(row.declared_minimatch, metadata.dependencies.minimatch);
  const require = createRequire(join(repository, row.consumer, "package.json"));
  assert.equal(relative(repository, require.resolve("minimatch")).replaceAll("\\", "/"), row.resolved_entry);
  assert.equal(require("minimatch/package.json").version, row.resolved_version);
}
assert.deepEqual(consumers.filter(row => row.resolved_version !== "3.1.5").map(row => [row.consumer, row.resolved_version]), [["node_modules/@typescript-eslint/typescript-estree", "10.2.6"]]);
assert.equal(lock.packages["node_modules/minimatch"].dev, true);
const audit = await json("checks/audit-full.json");
assert.equal(audit.metadata.vulnerabilities.total, 8);
assert.equal(audit.metadata.vulnerabilities.moderate, 8);
assert.deepEqual(audit.vulnerabilities.minimatch.nodes, ["node_modules/minimatch"]);
assert.equal(audit.vulnerabilities.minimatch.via[0].range, ">=7.0.0 <11.0.1");
assert.equal((await json("checks/audit-production.json")).metadata.vulnerabilities.total, 0);
assert.equal((await json("checks/minimatch-v10-releases.json")).at(-1), "10.2.6");
assert.equal((await json("checks/minimatch-tags.json")).latest, "11.0.5");
const registry = await json("checks/estree-registry.json");
assert.equal(registry.version, "8.72.1");
assert.equal(registry.dependencies.minimatch, "^10.2.2");

const ci = await json("checks/ci-21f590e.json");
assert.equal(ci.total_count, 1);
assert.equal(ci.run.head_sha, "21f590ee07d0ae7b0701d5d2f0299901dd49ddff");
assert.equal(ci.run.id, 42167019665);
assert.equal(ci.run.status, "completed");
assert.equal(ci.run.conclusion, "cancelled");
assert.equal(ci.job_count, 2);
assert.equal(ci.jobs.length, 2);
const windows = ci.jobs.find(row => row.name === "desktop (windows-latest)");
const macos = ci.jobs.find(row => row.name === "desktop (macos-14)");
assert.equal(windows.conclusion, "success");
assert.equal(macos.conclusion, "cancelled");
assert.deepEqual(macos.steps, []);
for (const name of ["Run npm ci", "Run npm run typecheck", "Run npm run lint --workspace=@othie/website", "Run npm test", "Check Windows startup script syntax"]) {
  assert.equal(windows.steps.find(row => row.name === name)?.conclusion, "success", name);
}
const checks = await json("checks/checks.json");
assert.equal(checks.code_commit, "688ba6b");
assert.equal(checks.exits["initial-focused-test"], 1);
assert(Object.entries(checks.exits).filter(([name]) => name !== "initial-focused-test").every(([, code]) => code === 0));
assert.equal(checks.clean_install_repeated, false);
const test = await readFile(join(root, "checks/test.txt"), "utf8");
assert(test.includes("139 passed | 1 skipped (140)"));
for (const count of [30, 102, 7, 10]) assert(test.includes(`${count} passed (${count})`));
assert((await readFile(join(root, "checks/focused-test.txt"), "utf8")).includes("4 passed (4)"));
assert((await readFile(join(root, "checks/prior-evidence.txt"), "utf8")).includes("30 parser controls, 49 plugin controls"));
console.log(`Verified ${manifest.files.length} files, 30 preserved parser judgments, 3 globstar guards, 26 level-one calls, level-two positive control, audits, 288 tests and partial Windows CI.`);
