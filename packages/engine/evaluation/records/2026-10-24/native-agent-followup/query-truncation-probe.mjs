// Run from any directory after building the engine. Output must be a new file.
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ManifestStore } from '../../../../dist/src/storage/manifest.js';
import { meaningfulTerms } from '../../../../dist/src/retrieval/terms.js';
import { nativeAgentDocuments } from '../../../../dist/src/evaluation/native-agent-cases.js';
import { qualityCorpus } from '../../../../dist/src/evaluation/quality-cases.js';

const repository = fileURLToPath(new URL('../../../../../../', import.meta.url));
const baseline = 'ff38e75';
const source = execFileSync('git', ['show', `${baseline}:packages/engine/src/retrieval/terms.ts`], { cwd: repository, encoding: 'utf8' });
const old = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const pilot = JSON.parse(await readFile(new URL('pilot/0-support-targets-othie.json', import.meta.url), 'utf8'));
const store = new ManifestStore(':memory:');
try {
  for (const doc of nativeAgentDocuments) {
    const id = doc.name, revision = `${id}-revision`;
    store.beginReplacement({ documentId: id, revisionId: revision, path: doc.name, profile: 'company', role: 'reference', authority: 50, weight: 1, contentHash: id, parserVersion: '1', chunkerVersion: '1', mtimeMs: 1, size: doc.text.length });
    store.publishReplacement(id, revision, id, [{ id, documentId: id, revisionId: revision, profile: 'company', sourcePath: doc.name, sourceRole: 'reference', authorityPriority: 50, retrievalWeight: 1, heading: '', location: 'lines 1-1', text: doc.text, contentHash: id, tokenCount: 1 }]);
  }
  const queries = [
    { id: 'original-native-pilot-prompt', text: pilot.prompt },
    { id: 'four-thousand-term-prefix', text: Array.from({ length: 4000 }, (_, i) => `preface${i}`).join(' ') + ' support tickets' },
  ];
  const results = queries.map(({ id, text }) => {
    const oldTerms = old.meaningfulTerms(text), newTerms = meaningfulTerms(text);
    const oldHits = store.db.prepare('SELECT id FROM chunks_fts WHERE chunks_fts MATCH ? ORDER BY bm25(chunks_fts) LIMIT 40')
      .all(oldTerms.map((term) => `"${term}"`).join(' OR ')).map((row) => row.id);
    const newHits = store.keywordSearch('company', text, 40).map((chunk) => chunk.id);
    return { id, query_chars: text.length, baseline_term_count: oldTerms.length, fixed_term_count: newTerms.length,
      baseline_has_support_term: oldTerms.includes('support'), fixed_has_support_term: newTerms.includes('support'),
      baseline_hits: oldHits, fixed_hits: newHits,
      baseline_has_expected_source: oldHits.includes('support.md'), fixed_has_expected_source: newHits.includes('support.md') };
  });
  const report = { baseline_commit: baseline, fix_commit: '554cd58', node: process.version, synthetic_only: true,
    method: 'Same in-memory SQLite corpus; old prefix terms and flat OR expression versus current complete terms and balanced OR expression. No host/model calls. The initial native prompt remains unchanged.',
    limitations: 'This isolates prefix truncation and SQL retrieval, not semantic relevance, packing, native model behavior or latency. Brand mentions support and can still match.', results,
    existing_applicability_query_terms: qualityCorpus('applicability').cases.map((item) => ({ id: item.id, unchanged: JSON.stringify(old.meaningfulTerms(item.query)) === JSON.stringify(meaningfulTerms(item.query)) })) };
  const output = process.argv[2];
  if (!output) throw new Error('Provide a new output filename');
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
} finally { store.close(); }
