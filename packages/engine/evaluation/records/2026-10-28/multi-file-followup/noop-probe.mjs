import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const compiled = path => pathToFileURL(join(repository, 'packages/engine/dist/src', path));
const { configSchema } = await import(compiled('config.js'));
const { runEngine } = await import(compiled('engine/lifecycle.js'));
const { meaningfulTerms } = await import(compiled('retrieval/terms.js'));
const { nativeAgentDocuments } = await import(compiled('evaluation/native-agent-cases.js'));
const { nativeAgentProjectCases } = await import(compiled('evaluation/native-agent-projects.js'));
const output = process.argv[2];
assert(output, 'Choose a new output JSON path');
const root = await mkdtemp(join(tmpdir(), 'othie-native-noop-'));
let running;
try {
  const docs = join(root, 'docs'); await mkdir(docs);
  for (const document of nativeAgentDocuments) await writeFile(join(docs, document.name), document.text);
  const config = configSchema.parse({ version: 1, data_dir: join(root, 'state'),
    ingestion: { watch_enabled: false, chunk_tokens: 500, overlap_tokens: 0 }, profiles: { company: {
      sources: [{ root: docs, role: 'reference', authority_priority: 50, retrieval_weight: 1, global_rule_documents: [] }],
      permitted_exports: 'rules_and_excerpts', providers: { embeddings: [], extraction: [], synthesis: [] },
      token_budget: { enabled: true, max_tokens: 500, tokenizer: 'o200k_base' },
    } } });
  running = await runEngine(config);
  const deadline = Date.now() + 20_000;
  while (running.engine.store.listActiveChunks('company').length !== nativeAgentDocuments.length) {
    assert(Date.now() < deadline, 'Indexing timed out');
    await new Promise(done => setTimeout(done, 50));
  }
  const original = nativeAgentProjectCases.find(item => item.control).task;
  const queries = [
    { id: 'original-control', query: original },
    { id: 'identifier-substitution', query: original.replace('solve(request)', 'solve(payload)') },
    { id: 'refund-positive', query: 'What is the refund request window?' },
  ];
  const records = [];
  for (const item of queries) {
    const terms = meaningfulTerms(item.query);
    const context = await running.engine.context('company', { query: item.query, surface: 'code', phase: 'turn_start', host: 'codex', max_tokens: 500 });
    records.push({ ...item, terms,
      source_overlaps: nativeAgentDocuments.map(document => ({ name: document.name, shared_terms: terms.filter(term => new Set(document.text.toLowerCase().match(/[\p{L}\p{N}]+/gu)).has(term)) })).filter(item => item.shared_terms.length),
      text: context.text, status: context.status,
      excerpts: context.brief.permitted_excerpts.length, rules: context.brief.applicable_rules.length,
    });
  }
  assert(records[0].excerpts > 0); assert.equal(records[1].excerpts, 0); assert(records[2].excerpts > 0);
  const report = { protocol: 'native-multi-file-noop-diagnostic-v1', recorded_at: new Date().toISOString(),
    synthetic_only: true, node: process.version, platform: process.platform,
    corpus_sha256: createHash('sha256').update(JSON.stringify(nativeAgentDocuments)).digest('hex'),
    compiled_terms_sha256: createHash('sha256').update(await readFile(fileURLToPath(compiled('retrieval/terms.js')))).digest('hex'),
    limitations: 'Same-engine diagnostic with original native task, a one-identifier query intervention and a refund-positive control. The original native fixture is unchanged. Identifier substitution is not a production fix or semantic no-op acceptance. Providers are disabled; unrelated lexical matches remain possible.', records };
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(records.map(({ id, excerpts, rules, source_overlaps }) => ({ id, excerpts, rules, source_overlaps }))));
} finally { await running?.close(); await rm(root, { recursive: true, force: true }); }
