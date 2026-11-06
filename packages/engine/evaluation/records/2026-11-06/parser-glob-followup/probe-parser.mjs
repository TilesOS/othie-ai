// Run in a fresh process: only the parser's minimatch cache entry is replaced.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '../../../../../..');
const website = join(repository, 'apps/website');
const require = createRequire(join(website, 'package.json'));
const [mode = 'baseline', candidatePath] = process.argv.slice(2);
assert(['baseline', 'candidate'].includes(mode));
assert.equal(process.argv.length, mode === 'baseline' ? 3 : 4);
const estree = createRequire(require.resolve('@typescript-eslint/typescript-estree/package.json'));
const minimatchId = estree.resolve('minimatch');
const original = estree('minimatch');
const candidateRequire = mode === 'candidate' ? createRequire(join(resolve(candidatePath), 'package.json')) : null;
const candidate = candidateRequire?.('minimatch');
if (candidate) require.cache[minimatchId].exports = candidate;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const { parserGlobCases } = await import(pathToFileURL(join(website, 'lib/lint-parser-fixtures.ts')));
const { probeParserGlobCase } = await import(pathToFileURL(join(website, 'lib/lint-parser-harness.ts')));
const results = [];
for (const item of parserGlobCases) {
  const observed = await probeParserGlobCase(item);
  results.push({ id: item.id, expected: item.expected, observed: observed.outcome, type: observed.type,
    passed: observed.outcome === item.expected && observed.type === (item.expected === 'typed' ? 'number' : null) });
}
const report = {
  protocol: 'parser-glob-parity-v1', recorded_at: new Date().toISOString(), node: process.version,
  platform: process.platform, mode,
  lockfile_sha256: sha(await readFile(join(repository, 'package-lock.json'))),
  fixture_sha256: sha(await readFile(join(website, 'lib/lint-parser-fixtures.ts'))),
  harness_sha256: sha(await readFile(join(website, 'lib/lint-parser-harness.ts'))),
  parser_version: require('@typescript-eslint/parser/package.json').version,
  estree_version: estree('./package.json').version,
  installed_minimatch: { version: estree('minimatch/package.json').version,
    module_type: typeof original, named_match_type: typeof original.minimatch },
  candidate: candidate ? { version: candidateRequire('minimatch/package.json').version,
    module_type: typeof candidate, named_match_type: typeof candidate.minimatch,
    entry_sha256: sha(await readFile(candidateRequire.resolve('minimatch'))) } : null,
  results, passed: results.filter(row => row.passed).length, total: results.length,
  all_passed: results.every(row => row.passed),
  limits: 'Actual parser project-service controls with isolated synthetic projects. Only the parser minimatch cache entry changes. No dependency installation in the repository, override, shim, exhaustive glob proof, vulnerability exploit or Windows/native-host acceptance.',
};
console.log(JSON.stringify(report, null, 2));
if (!report.all_passed) process.exitCode = 1;
