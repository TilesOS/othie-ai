import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '../../../../../..');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'));
const manifest = await json('manifest.json');
const actualFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else { assert(entry.isFile(), 'Unexpected symlink'); actualFiles.push(relative(root, path).replaceAll('\\', '/')); }
  }
}
await walk(root);
assert.deepEqual(actualFiles.filter((path) => path !== 'manifest.json').sort(), manifest.files.map((item) => item.path).sort());
const privateFields = new Set(['session_id', 'thread_id', 'turn_id', 'uuid', 'hook_id', 'request_id', 'memory_paths', 'messaging_socket_path', 'rate_limit_info']);
function metadata(value) {
  if (typeof value === 'string') {
    for (const line of value.split('\n')) { let nested; try { nested = JSON.parse(line); } catch { continue; } if (nested && typeof nested === 'object') metadata(nested); }
  } else if (Array.isArray(value)) value.forEach(metadata);
  else if (value && typeof value === 'object') for (const [key, entry] of Object.entries(value)) {
    if (privateFields.has(key)) assert.equal(entry, '<redacted>', `Private metadata: ${key}`);
    else metadata(entry);
  }
}
for (const item of manifest.files) {
  assert(!isAbsolute(item.path) && !item.path.split('/').includes('..'));
  const bytes = await readFile(join(root, item.path));
  assert.equal(bytes.length, item.bytes, item.path); assert.equal(digest(bytes), item.sha256, item.path);
  if (/\.(json|txt|md)$/.test(item.path)) {
    const text = bytes.toString('utf8');
    assert(!text.includes(homedir()) && !text.includes(repository), `Private path: ${item.path}`);
    assert(!/\/(?:private\/)?var\/folders\//.test(text), `Temporary host path: ${item.path}`);
    if (item.path.endsWith('.json')) metadata(JSON.parse(text));
  }
}
for (const item of (await json('publication.json')).files) assert.equal(digest(await readFile(join(root, item.path))), item.published_sha256);
const summary = await json('final/summary.json'), protocol = await json('final/protocol.json');
assert.equal(summary.completed, true);
assert.equal(summary.results.length, protocol.cases.length * protocol.options.repeats * 3);
assert.equal(new Set(summary.results.map((item) => `${item.case_id}/${item.repeat}/${item.condition}`)).size, summary.results.length);
for (const row of summary.results) {
  const record = await json(`final/${row.transcript}`);
  for (const field of ['case_id', 'repeat', 'condition', 'correct', 'operational', 'delivery_passed', 'context_complete', 'grade', 'input_tokens', 'output_tokens', 'cached_input_tokens']) assert.deepEqual(row[field], record[field]);
  if (row.condition === 'othie') assert.equal(row.host_model, protocol.requested_model);
}
assert.equal(summary.all_correct, summary.results.every((item) => item.correct));
for (const directory of ['final', 'hosted-controls', 'strict-latency', 'default-latency']) {
  const record = await json(`${directory}/protocol.json`);
  const artifacts = record.compiled_artifacts ?? [
    ...Object.entries(record.adapter_sha256).map(([host, sha256]) => ({ path: `integrations/${host}/dist/src/user-prompt-submit.js`, sha256 })),
    { path: 'packages/engine/dist/src/cli.js', sha256: record.cli_sha256 },
    { path: 'packages/hooks/dist/src/index.js', sha256: record.hook_runtime_sha256 },
  ];
  for (const artifact of artifacts) assert.equal(digest(await readFile(join(repository, artifact.path))), artifact.sha256, `${directory}/${artifact.path}`);
}
for (const artifact of (await json('verification.json')).compiled_artifacts) assert.equal(digest(await readFile(join(repository, artifact.path))), artifact.sha256, artifact.path);
console.log(JSON.stringify({ verified_files: manifest.files.length, native_trajectories: summary.results.length, all_correct: summary.all_correct }));
