// Each invocation is disposable: module cache changes must never reach application code.
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
assert(['baseline', 'raw', 'callable'].includes(mode));
assert.equal(process.argv.length, mode === 'baseline' ? 3 : 4);
const candidateRequire = mode === 'baseline' ? null : createRequire(join(resolve(candidatePath), 'package.json'));
const candidate = candidateRequire?.('minimatch');
const replacement = mode === 'callable'
  ? Object.assign((...args) => candidate.minimatch(...args), candidate)
  : candidate;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const consumers = [];
for (const plugin of ['eslint-plugin-react', 'eslint-plugin-import', 'eslint-plugin-jsx-a11y']) {
  const local = createRequire(require.resolve(`${plugin}/package.json`));
  const id = local.resolve('minimatch');
  const original = local('minimatch');
  consumers.push({ plugin, plugin_version: local(`${plugin}/package.json`).version,
    minimatch_version: local('minimatch/package.json').version, module_type: typeof original });
  if (replacement) require.cache[id].exports = replacement;
}
const { ESLint } = require('eslint');
const { lintGlobCases, rulesForGlobCase } = await import(pathToFileURL(join(website, 'lib/lint-glob-fixtures.ts')));
assert.equal(new Set(lintGlobCases.map(item => item.id)).size, lintGlobCases.length);
const results = [];
for (const item of lintGlobCases) {
  try {
    const eslint = new ESLint({ cwd: website, overrideConfigFile: join(website, 'eslint.config.mjs'),
      overrideConfig: [{ rules: rulesForGlobCase(item) }] });
    const [result] = await eslint.lintText(item.source, { filePath: item.file });
    const observed = result.messages.some(message => message.ruleId === item.rule);
    const configErrors = result.messages.filter(message => message.ruleId === null).length;
    results.push({ id: item.id, rule: item.rule, expected_diagnostic: item.expectedDiagnostic,
      observed_diagnostic: observed, fatal_errors: result.fatalErrorCount, config_errors: configErrors,
      runtime_error: null, passed: result.fatalErrorCount === 0 && configErrors === 0 && observed === item.expectedDiagnostic });
  } catch (error) {
    // Exclude error messages/stacks, which can contain host paths and arbitrary source text.
    results.push({ id: item.id, rule: item.rule, expected_diagnostic: item.expectedDiagnostic,
      observed_diagnostic: null, fatal_errors: null, config_errors: null,
      runtime_error: error instanceof TypeError ? 'TypeError' : 'other',
      callable_minimatch_failure: /minimatch.*(?:is not a function|is not callable)/i.test(String(error)),
      make_re_access_failure: /makeRe.*is not a function|Cannot read properties of undefined.*makeRe/i.test(String(error)), passed: false });
  }
}
const candidateMetadata = candidateRequire?.('minimatch/package.json');
const report = { protocol: 'lint-glob-parity-v1', recorded_at: new Date().toISOString(),
  node: process.version, platform: process.platform, mode,
  lockfile_sha256: sha(await readFile(join(repository, 'package-lock.json'))),
  fixture_sha256: sha(await readFile(join(website, 'lib/lint-glob-fixtures.ts'))),
  candidate: candidate ? { version: candidateMetadata.version, module_type: typeof candidate,
    replacement_type: typeof replacement, make_re_type: typeof candidate.makeRe,
    constructor_type: typeof candidate.Minimatch,
    constructor_make_re_type: typeof candidate.Minimatch?.prototype.makeRe,
    entry_sha256: sha(await readFile(candidateRequire.resolve('minimatch'))) } : null,
  consumers, results, passed: results.filter(row => row.passed).length, total: results.length,
  all_passed: results.every(row => row.passed),
  limits: 'Only three legacy plugin cache entries are replaced. The callable adapter is an evaluation-only API intervention. No npm override, dependency migration, production shim, complete glob proof, Windows simulation or exploitability claim.' };
console.log(JSON.stringify(report, null, 2));
if (!report.all_passed) process.exitCode = 1;
