// Replays only the adjacent synthetic request against an already-running local model.
// Does not launch Codex, download models, alter hook roles in production, or use login.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const model = 'qwen3.5:4b-mlx';
const digest = '61aa3858e9d3022e8fca725550089addd9289c4446f33bd09dfd12f95f2a6792';
const argv = process.argv.slice(2);
if (argv.length !== 2 || argv[0] !== '--out' || !argv[1] || argv[1].startsWith('--')) throw new Error('Usage: node replay.mjs --out NEW_DIRECTORY');
const out = resolve(argv[1]);
const source = await readFile(new URL('./provider-request.json', import.meta.url), 'utf8');
const base = JSON.parse(source);
if (base.model !== model || base.input.at(-1)?.role !== 'developer' || !JSON.stringify(base.input.at(-1)).includes('eleven hours')) throw new Error('Unexpected replay input');
// Private cache/client metadata must not be reintroduced into this public fixture.
if ('prompt_cache_key' in base || 'client_metadata' in base) throw new Error('Unexpected private metadata');
const endpoint = 'http://127.0.0.1:11436';
const identity = async () => {
  const response = await fetch(endpoint + '/api/tags', { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Cannot identify local model');
  const installed = (await response.json()).models.find(item => item.name === model);
  if (installed?.digest !== digest) throw new Error('Installed model digest changed');
  return installed;
};
await identity();
await mkdir(out, { mode: 0o700 }); // Exclusive destination: never overwrite evidence.
const save = async (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const hash = text => createHash('sha256').update(text).digest('hex');
const modes = ['original', 'developer-first', 'hook-as-system', 'hook-as-user', 'minimal-developer', 'minimal-system', 'minimal-user', 'minimal-absent'];
const protocol = { protocol: 'local-context-role-replay-v1', recorded_at: new Date().toISOString(), synthetic_only: true,
  model, digest, node: process.version, platform: process.platform, source_sha256: hash(source), script_sha256: hash(await readFile(fileURLToPath(import.meta.url))),
  repeats: 3, modes, generation: 'Captured request options and installed model defaults; no temperature/seed override. Rotated case order per repeat.',
  limitations: 'Evaluation-only role interventions, not native-hook acceptance or a production role rewrite. Variable model sampling, warm state and machine load; no causal attribution between provider conversion and model internals. Timings include HTTP and generation, not hook latency.' };
await save('protocol.json', protocol);
const records = [];
for (let repeat = 1; repeat <= 3; repeat++) {
  const order = [...modes.slice(repeat - 1), ...modes.slice(0, repeat - 1)];
  for (const mode of order) {
    const body = structuredClone(base), policy = body.input.at(-1), query = body.input.at(-2);
    if (mode === 'developer-first') body.input = [policy, ...body.input.slice(0, -1)];
    if (mode === 'hook-as-system') policy.role = 'system';
    if (mode === 'hook-as-user') policy.role = 'user';
    if (mode.startsWith('minimal-')) {
      body.instructions = 'Answer using the supplied policy. Reply with the number only; if missing reply unknown.';
      body.tools = [];
      body.input = mode === 'minimal-absent' ? [query] : [{ ...policy, role: mode.slice(8) }, query];
    }
    const started = performance.now();
    let record;
    try {
      const response = await fetch(endpoint + '/v1/responses', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
      const raw = await response.text();
      const events = raw.split('\n').filter(line => line.startsWith('data: ')).flatMap(line => {
        try { return [JSON.parse(line.slice(6))]; } catch { return []; }
      });
      // Retain model text and usage; response/cache/session identifiers are excluded.
      const completed = events.filter(event => event.type === 'response.completed').at(-1);
      const answer = events.filter(event => event.type === 'response.output_text.done').map(event => event.text).join('').trim();
      const content = events.filter(event => event.type === 'response.reasoning_summary_text.done').map(event => event.text);
      record = { repeat, mode, request_sha256: hash(JSON.stringify(body)), response_sha256: hash(raw), status: response.status,
        completed: !!completed, answer, reasoning: content, usage: completed?.response?.usage ?? null, elapsed_ms: performance.now() - started,
        context_answer_passed: response.ok && !!completed && answer === (mode === 'minimal-absent' ? 'unknown' : '11') };
    } catch (error) {
      record = { repeat, mode, request_sha256: hash(JSON.stringify(body)), completed: false, error: error.name, elapsed_ms: performance.now() - started, context_answer_passed: false };
    }
    await save(`${repeat}-${mode}.json`, record);
    records.push(record);
    console.log(`${repeat}/${mode}: ${record.answer ?? record.error}`);
  }
}
await identity();
await save('summary.json', { ...protocol, identity_unchanged: true, records });
