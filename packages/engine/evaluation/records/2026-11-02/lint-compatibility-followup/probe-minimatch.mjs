// Disposable-process diagnostic, not an npm override or production shim.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '../../../../../..');
const website = join(repository, 'apps/website');
const require = createRequire(join(website, 'package.json'));
const candidateRoot = process.argv[2];
assert(process.argv.length <= 3);
const candidateRequire = candidateRoot ? createRequire(join(resolve(candidateRoot), 'package.json')) : null;
const replacement = candidateRequire?.('minimatch');
const plugins = ['eslint-plugin-react', 'eslint-plugin-import', 'eslint-plugin-jsx-a11y'];
const consumers = [];
for (const plugin of plugins) {
  const local = createRequire(require.resolve(`${plugin}/package.json`));
  const id = local.resolve('minimatch');
  const original = local('minimatch');
  const metadata = local('minimatch/package.json');
  consumers.push({ plugin, installed_version: metadata.version, installed_module_type: typeof original });
  if (replacement) require.cache[id].exports = replacement;
}

const { ESLint } = require('eslint');
const probes = [
  { id: 'react-custom-component', rule: 'react/no-danger',
    options: { customComponentNames: ['Html*'] },
    source: 'export default function Preview() { return <HtmlPanel dangerouslySetInnerHTML={{ __html: "hello" }} />; }',
    file: 'lib/lint-fixtures/danger.tsx' },
  { id: 'import-exception', rule: 'import/no-import-module-exports',
    options: { exceptions: ['**/allowed/**'] },
    source: 'import React from "react"; module.exports = React;',
    file: 'lib/lint-fixtures/blocked/mixed.js' },
  { id: 'accessibility-control', rule: 'jsx-a11y/label-has-associated-control',
    options: { controlComponents: ['Input*'], assert: 'nesting' },
    source: 'export default function Preview() { return <label>Name<OtherField /></label>; }',
    file: 'lib/lint-fixtures/unlabelled.tsx' },
];
const results = [];
for (const probe of probes) {
  try {
    const eslint = new ESLint({ cwd: website, overrideConfigFile: join(website, 'eslint.config.mjs'),
      overrideConfig: [{ rules: { [probe.rule]: ['error', probe.options] } }] });
    const [result] = await eslint.lintText(probe.source, { filePath: probe.file });
    results.push({ id: probe.id, rule: probe.rule, fatal_errors: result.fatalErrorCount,
      detected: result.messages.some(message => message.ruleId === probe.rule), runtime_error: null });
  } catch (error) {
    // Do not publish stack traces, physical filenames or arbitrary error text.
    results.push({ id: probe.id, rule: probe.rule, fatal_errors: null, detected: false,
      runtime_error: error instanceof TypeError ? 'TypeError' : 'other',
      callable_minimatch_failure: /minimatch.*(?:is not a function|is not callable)/i.test(String(error)) });
  }
}
const lock = await readFile(join(repository, 'package-lock.json'));
const report = { recorded_at: new Date().toISOString(), node: process.version, platform: process.platform,
  protocol: 'legacy-minimatch-consumer-probe-v1',
  lockfile_sha256: createHash('sha256').update(lock).digest('hex'),
  intervention: replacement ? 'replace three legacy consumer CommonJS cache exports in this process only' : 'installed modules',
  candidate: replacement ? { version: candidateRequire('minimatch/package.json').version, module_type: typeof replacement } : null,
  consumers, results, all_passed: results.every(result => result.fatal_errors === 0 && result.detected && !result.runtime_error),
  limits: 'Not a complete dependency migration, npm resolution simulation, glob parity proof or exploitability assessment. Fresh process required for each condition. Repository dependencies and module files unchanged.' };
console.log(JSON.stringify(report, null, 2));
if (!report.all_passed) process.exitCode = 1;
