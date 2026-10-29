import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '../../../../../..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
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
assert.deepEqual(actualFiles.filter(path => path !== 'manifest.json').sort(), manifest.files.map(item => item.path).sort());
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

const { gradeModules } = await import(pathToFileURL(join(repository, 'packages/engine/dist/src/evaluation/agent-grader.js')));
const { nativeAgentContextComplete, nativeAgentDelivery, nativeAgentEvents } = await import(pathToFileURL(join(repository, 'packages/engine/dist/src/evaluation/native-agent.js')));
const { nativeAgentProjectCases } = await import(pathToFileURL(join(repository, 'packages/engine/dist/src/evaluation/native-agent-projects.js')));
const summary = await json('final/summary.json'), protocol = await json('final/protocol.json');
assert.equal(summary.completed, true);
assert.equal(protocol.protocol_version, 'native-agent-v3');
assert.equal(protocol.options.corpus, 'multi-file');
assert.deepEqual(protocol.cases, nativeAgentProjectCases);
assert.equal(protocol.fixture_sha256, digest(JSON.stringify({ cases: protocol.cases, documents: protocol.documents, instructions: protocol.instructions, instructions_location: protocol.instructions_location, policy_sources: protocol.policy_sources })));
assert.equal(summary.results.length, protocol.cases.length * protocol.options.repeats * 3);
const observed = new Set();
for (const row of summary.results) {
  const key = `${row.repeat}-${row.case_id}-${row.condition}`;
  assert(!observed.has(key)); observed.add(key);
  assert.equal(row.transcript, `${key}.json`);
  const record = await json(`final/${row.transcript}`);
  for (const [field, value] of Object.entries(row)) if (field !== 'transcript') assert.deepEqual(value, record[field], `${key}/${field}`);
  const scenario = protocol.cases.find(item => item.id === row.case_id);
  assert(scenario);
  const grade = await gradeModules(record.final_files, scenario.project.entry, scenario.hiddenProbes);
  const publicGrade = await gradeModules(record.final_files, scenario.project.entry, scenario.publicProbes, true);
  assert.deepEqual(record.grade, grade); assert.deepEqual(record.public_grade, publicGrade);
  for (const [field, value] of Object.entries(nativeAgentEvents(record.response.stdout))) assert.deepEqual(record[field], value);
  const operational = record.response.code === 0 && !record.response.timed_out && !record.response.output_limit && record.completed && record.integrity.passed && record.ran_public_tests;
  assert.equal(record.operational, operational);
  if (row.condition === 'othie') {
    assert.equal(row.host_model, protocol.requested_model);
    const hasItems = /<(?:rule|excerpt)\b/.test(record.expected_context.text);
    assert.equal(record.delivery_passed, nativeAgentDelivery(record.receipt, record.expected_context.text, hasItems, protocol.options.contextTokens) && hasItems === !scenario.control);
    assert.equal(record.context_complete, nativeAgentContextComplete(scenario, record.expected_context.text, hasItems));
  } else { assert.equal(record.receipt, null); assert.equal(record.context_complete, null); }
  assert.equal(record.correct, operational && record.delivery_passed && record.context_complete !== false && publicGrade.passed === publicGrade.total && grade.passed === grade.total);
}
for (let repeat = 0; repeat < protocol.options.repeats; repeat++) for (const scenario of protocol.cases) for (const condition of ['baseline', 'full_documents', 'othie']) assert(observed.has(`${repeat}-${scenario.id}-${condition}`));
assert.equal(summary.all_correct, summary.results.every(item => item.correct));
const probe = await json('noop-probe.json');
assert.equal(probe.corpus_sha256, digest(JSON.stringify(protocol.documents)));
assert.equal(probe.compiled_terms_sha256, digest(await readFile(join(repository, 'packages/engine/dist/src/retrieval/terms.js'))));
assert.equal(probe.records[0].query, protocol.cases.find(item => item.control).task);
assert.equal(probe.records[1].query, probe.records[0].query.replace('solve(request)', 'solve(payload)'));
assert.deepEqual(probe.records[0].source_overlaps, [{ name: 'refunds.md', shared_terms: ['request'] }]);
assert(probe.records[0].excerpts > 0); assert.equal(probe.records[1].excerpts, 0); assert(probe.records[2].excerpts > 0);
const ci = await json('ci-5da7f3e.json');
assert.equal(ci.run.head_sha, '5da7f3e113bc712c73403c160d14ae80fb61093f');
assert.equal(ci.run.conclusion, 'success'); assert.equal(ci.jobs.length, 2);
for (const job of ci.jobs) {
  assert.equal(job.conclusion, 'success');
  for (const name of ['Run npm ci', 'Run npm run typecheck', 'Run npm test']) assert(job.steps.some(step => step.name === name && step.conclusion === 'success'));
}
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
console.log(JSON.stringify({ verified_files: manifest.files.length, regraded_trajectories: summary.results.length, all_correct: summary.all_correct }));
