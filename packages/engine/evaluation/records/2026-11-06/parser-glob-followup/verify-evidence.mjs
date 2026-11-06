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
const consumer = await json('checks/consumer.json');
assert.equal(consumer.version, '8.70.0');
assert.equal(consumer.declared_minimatch, '^10.2.2');
assert.equal(consumer.installed_minimatch, '10.2.6');
assert.deepEqual(consumer.options, { dot: true });
assert.equal(sha(await readFile(join(repository, consumer.path))), consumer.sha256);
const { parserGlobCases } = await import(pathToFileURL(join(repository, 'apps/website/lib/lint-parser-fixtures.ts')));
assert.equal(parserGlobCases.length, 30);
assert.equal(new Set(parserGlobCases.map(item => item.id)).size, 30);
const parserProbes = await Promise.all(['parser-baseline', 'parser-v11'].map(name => json(`checks/${name}.json`)));
for (const [index, probe] of parserProbes.entries()) {
  assert.equal(probe.protocol, 'parser-glob-parity-v1');
  assert.equal(probe.platform, 'darwin');
  assert.equal(probe.mode, ['baseline', 'candidate'][index]);
  assert.equal(probe.total, 30);
  assert.equal(probe.lockfile_sha256, sources['package-lock.json']);
  assert.equal(probe.fixture_sha256, sources['apps/website/lib/lint-parser-fixtures.ts']);
  assert.equal(probe.harness_sha256, sources['apps/website/lib/lint-parser-harness.ts']);
  assert.equal(probe.parser_version, '8.70.0');
  assert.equal(probe.estree_version, '8.70.0');
  assert.deepEqual(probe.installed_minimatch, { version: '10.2.6', module_type: 'object', named_match_type: 'function' });
  assert.deepEqual(probe.results.map(row => row.id), parserGlobCases.map(item => item.id));
  for (const [i, row] of probe.results.entries()) {
    assert.equal(row.expected, parserGlobCases[i].expected);
    assert.equal(row.type, row.observed === 'typed' ? 'number' : null);
    assert.equal(row.passed, row.observed === row.expected && row.type === (row.expected === 'typed' ? 'number' : null));
  }
  assert.equal(probe.passed, probe.results.filter(row => row.passed).length);
  assert.equal(probe.all_passed, probe.results.every(row => row.passed));
}
assert.deepEqual(parserProbes.map(probe => probe.passed), [30, 28]);
assert.equal(parserProbes[0].candidate, null);
assert.deepEqual(parserProbes[1].results.filter(row => !row.passed).map(({ id, expected, observed, type }) => ({ id, expected, observed, type })), [
  { id: 'astral-one-question', expected: 'unmatched', observed: 'typed', type: 'number' },
  { id: 'astral-two-questions', expected: 'typed', observed: 'unmatched', type: null },
]);
const { lintGlobCases } = await import(pathToFileURL(join(repository, 'apps/website/lib/lint-glob-fixtures.ts')));
const plugins = await Promise.all(['plugins-baseline', 'plugins-raw-v11', 'plugins-callable-v11'].map(name => json(`checks/${name}.json`)));
for (const [index, probe] of plugins.entries()) {
  assert.equal(probe.mode, ['baseline', 'raw', 'callable'][index]);
  assert.equal(probe.total, 49);
  assert.equal(probe.lockfile_sha256, sources['package-lock.json']);
  assert.equal(probe.fixture_sha256, sources['apps/website/lib/lint-glob-fixtures.ts']);
  assert.deepEqual(probe.results.map(row => row.id), lintGlobCases.map(item => item.id));
  for (const [i, row] of probe.results.entries()) {
    assert.equal(row.expected_diagnostic, lintGlobCases[i].expectedDiagnostic);
    assert.equal(row.passed, row.runtime_error === null && row.fatal_errors === 0 && row.config_errors === 0 && row.observed_diagnostic === row.expected_diagnostic);
  }
  assert.equal(probe.passed, probe.results.filter(row => row.passed).length);
  assert.equal(probe.all_passed, probe.results.every(row => row.passed));
  assert.deepEqual(probe.consumers, plugins[0].consumers);
  assert.equal(probe.consumers.length, 3);
  assert(probe.consumers.every(item => item.minimatch_version === '3.1.5' && item.module_type === 'function'));
}
assert.deepEqual(plugins.map(probe => probe.passed), [49, 0, 42]);
assert(plugins[1].results.every(row => row.runtime_error === 'TypeError'));
assert.equal(plugins[1].results.filter(row => row.callable_minimatch_failure).length, 43);
assert.equal(plugins[1].results.filter(row => row.make_re_access_failure).length, 6);
const runtimeFailures = plugins[2].results.filter(row => row.runtime_error);
assert.equal(runtimeFailures.length, 6);
assert(runtimeFailures.every(row => row.id.startsWith('import-make-re-') && row.make_re_access_failure));
const behavior = plugins[2].results.filter(row => !row.passed && !row.runtime_error);
assert.equal(behavior.length, 1);
assert.equal(behavior[0].id, 'import-namespace-unicode-astral');
assert.equal(behavior[0].observed_diagnostic, false);
const candidatePackages = await json('checks/candidate-packages.json');
assert.equal(candidatePackages.length, 4);
assert.equal(new Set(candidatePackages.map(item => item.name)).size, 4);
const candidate = candidatePackages.find(item => item.name === 'minimatch');
const registry = await json('checks/candidate-registry.json');
assert.equal(candidate.version, '11.0.5');
assert.equal(candidate.version, registry.version);
assert.equal(candidate.integrity, registry['dist.integrity']);
const entry = candidate.files.find(file => file.path === 'dist/commonjs/index.js');
assert(entry);
for (const probe of [parserProbes[1], ...plugins.slice(1)]) {
  assert.equal(probe.candidate.version, '11.0.5');
  assert.equal(probe.candidate.module_type, 'object');
  assert.equal(probe.candidate.entry_sha256, entry.sha256);
}
assert.equal((await json('checks/estree-registry.json'))['dependencies.minimatch'], '^10.2.2');
assert.equal((await json('checks/minimatch-tags.json'))['legacy-v3'], '3.1.5');
const audit = await json('checks/audit-full.json');
assert.equal(audit.metadata.vulnerabilities.total, 8);
assert.equal(audit.metadata.vulnerabilities.moderate, 8);
const advisories = Object.values(audit.vulnerabilities).flatMap(item => item.via.filter(via => typeof via !== 'string'));
assert.equal(advisories.length, 1);
assert.equal(advisories[0].url, 'https://github.com/advisories/GHSA-g3hv-75wg-m249');
assert.equal(advisories[0].range, '>=7.0.0 <11.0.1');
assert.deepEqual(audit.vulnerabilities.minimatch.nodes, ['node_modules/minimatch']);
assert.deepEqual(audit.vulnerabilities.minimatch.effects, ['@typescript-eslint/typescript-estree']);
assert.equal((await json('checks/audit-production.json')).metadata.vulnerabilities.total, 0);
const advisory = await json('checks/advisory.json');
assert.equal(advisory.updated_at, '2026-11-04T16:50:04Z');
assert.equal(advisory.vulnerabilities[0].vulnerable_version_range, '>= 7.0.0, < 11.0.1');
const checks = await json('checks/checks.json');
assert.deepEqual(checks, [
  ['audit-full', 1], ['audit-production', 0], ['parser-baseline', 0], ['parser-candidate', 1],
  ['plugins-baseline', 0], ['plugins-raw', 1], ['plugins-callable', 1], ['build-restricted-interrupted', 130],
  ['build', 0], ['typecheck', 0], ['lint', 0], ['test', 0], ['final-typecheck', 0], ['prior-evidence', 0],
].map(([name, exit_code]) => ({ name, exit_code })));
const tests = await readFile(join(root, 'checks/test.txt'), 'utf8');
assert.deepEqual([...tests.matchAll(/Tests\s+(\d+) passed/g)].map(match => Number(match[1])), [139, 30, 98, 7, 10]);
assert.match(tests, /1 skipped/);
assert.match(await readFile(join(root, 'checks/prior-evidence.txt'), 'utf8'), /Verified 35 files/);
const ci = await json('checks/ci-c7ea37d.json');
assert.equal(ci.run.head_sha, 'c7ea37d4d7ebd35b6df78ff67cdb02b9f5f7bacb');
assert.equal(ci.run.id, 41584677601);
assert.equal(ci.run.conclusion, 'success');
assert.equal(ci.job_count, 2);
assert.deepEqual(ci.jobs.map(job => job.name).sort(), ['desktop (macos-14)', 'desktop (windows-latest)']);
for (const job of ci.jobs) {
  assert.equal(job.head_sha, ci.run.head_sha);
  assert.equal(job.conclusion, 'success');
  for (const name of ['Run npm ci', 'Run npm run typecheck', 'Run npm run lint --workspace=@othie/website', 'Run npm test',
    ...(job.name.includes('windows') ? ['Check Windows startup script syntax'] : [])]) {
    assert.equal(job.steps.find(step => step.name === name)?.conclusion, 'success', `${job.name}: ${name}`);
  }
}
console.log(`Verified ${manifest.files.length} files, 30 parser controls, 49 plugin controls, candidate failures, revised audit scope, 284 tests and prior macOS/Windows CI.`);
