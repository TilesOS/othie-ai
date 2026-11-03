import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '../../../../../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
async function filesAt(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    assert(!entry.isSymbolicLink(), path);
    if (entry.isDirectory()) paths.push(...await filesAt(path));
    else { assert(entry.isFile()); paths.push(relative(root, path).replaceAll('\\', '/')); }
  }
  return paths.sort();
}
const manifest = await json('manifest.json');
assert.deepEqual((await filesAt(root)).filter(path => path !== 'manifest.json'), manifest.files.map(file => file.path).sort());
for (const item of manifest.files) {
  const bytes = await readFile(join(root, item.path));
  assert.equal(bytes.length, item.bytes, item.path);
  assert.equal(sha(bytes), item.sha256, item.path);
  if (/\.(?:json|txt|md)$/.test(item.path)) {
    assert(!/\/Users\/|\/private\/var\/folders\/|access_token|refresh_token|account_rate_limits/.test(bytes.toString()), item.path);
  }
}
const sources = await json('checks/source-hashes.json');
for (const [path, hash] of Object.entries(sources)) assert.equal(sha(await readFile(join(repository, path))), hash, path);
const { lintGlobCases } = await import(pathToFileURL(join(repository, 'apps/website/lib/lint-glob-fixtures.ts')));
assert.equal(lintGlobCases.length, 49);
assert.equal(new Set(lintGlobCases.map(item => item.id)).size, 49);
assert.equal(new Set(lintGlobCases.map(item => item.rule)).size, 6);
const probes = await Promise.all(['baseline', 'raw-v11', 'callable-v11'].map(name => json(`checks/${name}.json`)));
for (const [index, probe] of probes.entries()) {
  assert.equal(probe.protocol, 'lint-glob-parity-v1');
  assert.equal(probe.platform, 'darwin');
  assert.equal(probe.mode, ['baseline', 'raw', 'callable'][index]);
  assert.equal(probe.total, 49);
  assert.equal(probe.lockfile_sha256, sources['package-lock.json']);
  assert.equal(probe.fixture_sha256, sources['apps/website/lib/lint-glob-fixtures.ts']);
  assert.deepEqual(probe.consumers, probes[0].consumers);
  assert.equal(probe.consumers.length, 3);
  assert(probe.consumers.every(item => item.minimatch_version === '3.1.5' && item.module_type === 'function'));
  assert.deepEqual(probe.results.map(row => row.id), lintGlobCases.map(item => item.id));
  for (const [i, row] of probe.results.entries()) {
    const fixture = lintGlobCases[i];
    assert.equal(row.rule, fixture.rule);
    assert.equal(row.expected_diagnostic, fixture.expectedDiagnostic);
    assert.equal(row.passed, row.runtime_error === null && row.fatal_errors === 0 && row.config_errors === 0 && row.observed_diagnostic === row.expected_diagnostic);
  }
  assert.equal(probe.passed, probe.results.filter(row => row.passed).length);
  assert.equal(probe.all_passed, probe.results.every(row => row.passed));
}
assert.deepEqual(probes.map(probe => probe.passed), [49, 0, 42]);
assert.equal(probes[0].candidate, null);
for (const probe of probes.slice(1)) {
  assert.equal(probe.candidate.version, '11.0.4');
  assert.equal(probe.candidate.module_type, 'object');
  assert.equal(probe.candidate.make_re_type, 'undefined');
  assert.equal(probe.candidate.constructor_type, 'function');
  assert.equal(probe.candidate.constructor_make_re_type, 'undefined');
}
assert.equal(probes[1].candidate.replacement_type, 'object');
assert.equal(probes[2].candidate.replacement_type, 'function');
const raw = probes[1].results;
assert(raw.every(row => row.runtime_error === 'TypeError'));
assert.equal(raw.filter(row => row.callable_minimatch_failure).length, 43);
assert.equal(raw.filter(row => row.make_re_access_failure).length, 6);
const adapted = probes[2].results;
const runtimeFailures = adapted.filter(row => row.runtime_error);
assert.equal(runtimeFailures.length, 6);
assert(runtimeFailures.every(row => row.id.startsWith('import-make-re-') && row.make_re_access_failure));
const behaviorFailures = adapted.filter(row => !row.passed && !row.runtime_error);
assert.equal(behaviorFailures.length, 1);
assert.equal(behaviorFailures[0].id, 'import-namespace-unicode-astral');
assert.equal(behaviorFailures[0].expected_diagnostic, true);
assert.equal(behaviorFailures[0].observed_diagnostic, false);
const initial = await json('checks/initial-classification.json');
assert.deepEqual(initial.affected_rows.map(row => row.id), runtimeFailures.map(row => row.id));
assert(initial.affected_rows.every(row => row.runtime_error === 'TypeError' && row.missing_make_re_failure === false && row.passed === false));
assert.deepEqual(await json('checks/probe-checks.json'), [
  { mode: 'baseline', exit_code: 0 }, { mode: 'raw', exit_code: 1 }, { mode: 'callable', exit_code: 1 },
]);
const candidate = await json('checks/candidate-package.json');
const registry = await json('checks/minimatch-candidate-registry.json');
const priorPackages = JSON.parse(await readFile(join(repository, 'packages/engine/evaluation/records/2026-11-02/lint-compatibility-followup/checks/candidate-packages.json'), 'utf8'));
const priorCandidate = priorPackages.find(item => item.name === 'minimatch');
assert.equal(candidate.version, registry.version);
assert.equal(candidate.integrity, registry.dist.integrity);
assert.equal(candidate.integrity, priorCandidate.integrity);
assert.equal(candidate.entry_sha256, priorCandidate.files.find(item => item.path === candidate.entry).sha256);
for (const probe of probes.slice(1)) assert.equal(probe.candidate.entry_sha256, candidate.entry_sha256);
const integrity = await json('checks/candidate-integrity-check.json');
assert.equal(integrity.package_count, priorPackages.length);
assert.equal(integrity.file_count, priorPackages.reduce((n, item) => n + item.files.length, 0));
assert.equal(integrity.all_recorded_files_match, true);
assert.equal((await json('checks/minimatch-tags.json'))['legacy-v3'], '3.1.5');
for (const name of ['plugin', 'import', 'a11y']) assert.equal((await json(`checks/${name}-registry.json`))['dependencies.minimatch'], '^3.1.2');
const checks = await json('checks/checks.json');
assert.deepEqual(checks.map(row => row.name), ['build', 'typecheck', 'lint', 'test', 'audit-full', 'audit-production', 'prior-evidence']);
for (const row of checks) assert.equal(row.exit_code, row.name === 'audit-full' ? 1 : 0);
assert.deepEqual(await json('checks/final-checks.json'), [{ name: 'final-typecheck', command: ['npm', 'run', 'typecheck'], exit_code: 0 }]);
const tests = await readFile(join(root, 'checks/test.txt'), 'utf8');
assert.equal([...tests.matchAll(/Tests\s+(\d+) passed/g)].reduce((n, match) => n + Number(match[1]), 0), 254);
assert.match(tests, /1 skipped/);
const audit = await json('checks/audit-full.json');
assert.equal(audit.metadata.vulnerabilities.total, 16);
assert.equal(audit.metadata.vulnerabilities.moderate, 16);
const advisories = Object.values(audit.vulnerabilities).flatMap(item => item.via.filter(via => typeof via !== 'string'));
assert.equal(advisories.length, 1);
assert.equal(advisories[0].url, 'https://github.com/advisories/GHSA-g3hv-75wg-m249');
assert.equal((await json('checks/audit-production.json')).metadata.vulnerabilities.total, 0);
const ci = await json('checks/ci-lookup.json');
assert.equal(ci.queries.length, 2);
for (const [i, query] of ci.queries.entries()) {
  assert(query.url.includes(['2fde37d0ffaf5fb270f562d0be325a3ee50b8541', '17cf004442fa59ef7fec73b091b4282b44a00e08'][i]));
  assert.equal(query.response.total_count, 0);
  assert.deepEqual(query.response.workflow_runs, []);
}
console.log(`Verified ${manifest.files.length} files, 49 fixture expectations, raw/adapted v11 failures, candidate identity, 254 tests, audits and pending CI lookups.`);
