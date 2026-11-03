import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '../../../../../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
async function filesAt(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    assert(!entry.isSymbolicLink());
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
const lockHash = sources['package-lock.json'];
const baseline = await json('checks/minimatch-baseline.json');
const candidate = await json('checks/minimatch-v11.json');
const expectedIds = ['react-custom-component', 'import-exception', 'accessibility-control'];
for (const probe of [baseline, candidate]) {
  assert.equal(probe.protocol, 'legacy-minimatch-consumer-probe-v1');
  assert.equal(probe.lockfile_sha256, lockHash);
  assert.deepEqual(probe.results.map(row => row.id), expectedIds);
  assert.equal(probe.consumers.length, 3);
  for (const consumer of probe.consumers) {
    assert.equal(consumer.installed_version, '3.1.5');
    assert.equal(consumer.installed_module_type, 'function');
  }
}
assert.deepEqual(baseline.consumers, candidate.consumers);
assert.equal(baseline.candidate, null);
assert.equal(baseline.all_passed, true);
for (const row of baseline.results) {
  assert.equal(row.detected, true); assert.equal(row.fatal_errors, 0); assert.equal(row.runtime_error, null);
}
assert.equal(candidate.candidate.version, '11.0.4');
assert.equal(candidate.candidate.module_type, 'object');
assert.equal(candidate.all_passed, false);
for (const row of candidate.results) {
  assert.equal(row.detected, false); assert.equal(row.runtime_error, 'TypeError'); assert.equal(row.callable_minimatch_failure, true);
}
const tags = await json('checks/minimatch-dist-tags.json');
assert.equal(tags['legacy-v3'], '3.1.5');
const next = await json('checks/next-eslint-registry.json');
assert.equal(next.version, '16.4.4');
for (const consumer of baseline.consumers) assert(next.dependencies[consumer.plugin]);
const eslint = await json('checks/eslint-registry.json');
assert.equal(eslint.version, '10.14.0');
assert.equal(eslint.dependencies.minimatch, '^10.2.6');
const registry = await json('checks/minimatch-candidate-registry.json');
const packages = await json('checks/candidate-packages.json');
const installedCandidate = packages.find(item => item.name === 'minimatch');
assert.equal(installedCandidate.version, registry.version);
assert.equal(installedCandidate.integrity, registry.dist.integrity);
assert(installedCandidate.files.some(item => item.path === 'dist/commonjs/index.js' && /^[a-f\d]{64}$/.test(item.sha256)));
const checks = await json('checks/checks.json');
assert.deepEqual(checks.validation.map(row => row.name), ['install', 'build', 'typecheck', 'test', 'lint', 'audit-full', 'audit-production']);
for (const row of checks.validation) assert.equal(row.exit_code, row.name === 'audit-full' ? 1 : 0);
assert.deepEqual(checks.final_verification.map(row => row.name), ['final-typecheck', 'previous-evidence']);
assert(checks.final_verification.every(row => row.exit_code === 0));
const tests = await readFile(join(root, 'checks/test.txt'), 'utf8');
assert.equal([...tests.matchAll(/Tests\s+(\d+) passed/g)].reduce((total, match) => total + Number(match[1]), 0), 205);
assert.match(tests, /1 skipped/);
const audit = await json('checks/audit-full.json');
assert.equal(audit.metadata.vulnerabilities.total, 16);
assert.equal(audit.metadata.vulnerabilities.moderate, 16);
const advisories = Object.values(audit.vulnerabilities).flatMap(item => item.via.filter(via => typeof via !== 'string'));
assert.equal(advisories.length, 1);
assert.equal(advisories[0].url, 'https://github.com/advisories/GHSA-g3hv-75wg-m249');
assert.equal((await json('checks/audit-production.json')).metadata.vulnerabilities.total, 0);
const ci = await json('ci-5937f7c.json');
assert.equal(ci.run.head_sha, '5937f7c244377d3c77127852b922a9ffe81b86a6');
assert.equal(ci.run.conclusion, 'success');
assert.deepEqual(ci.jobs.map(job => job.name).sort(), ['desktop (macos-14)', 'desktop (windows-latest)']);
for (const job of ci.jobs) {
  assert.equal(job.head_sha, ci.run.head_sha); assert.equal(job.conclusion, 'success');
  const steps = new Map(job.steps.map(step => [step.name, step.conclusion]));
  for (const step of ['Run npm ci', 'Run npm run typecheck', 'Run npm test']) assert.equal(steps.get(step), 'success');
  if (job.name.includes('windows')) assert.equal(steps.get('Check Windows startup script syntax'), 'success');
}
console.log(`Verified ${manifest.files.length} files, source hashes, three baseline/failed-candidate probes, 205 tests, both audits and prior CI jobs.`);
