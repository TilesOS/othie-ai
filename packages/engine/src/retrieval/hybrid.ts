import type { OthieConfig, OthieProfile } from "../config.js";
import type { ManifestStore } from "../storage/manifest.js";
import type { ProviderRegistry } from "../providers/registry.js";
import type { LanceIndex } from "./lance-index.js";
import type { SearchHit } from "../types.js";
import { hasLexicalOverlap, meaningfulTerms } from "./terms.js";

export interface RetrievalResult { hits: SearchHit[]; keywordAvailable: boolean; vectorAvailable: boolean }

export async function hybridRetrieve(input: { query: string; profileName: string; profile: OthieProfile; config: OthieConfig; store: ManifestStore; lance: LanceIndex; providers: ProviderRegistry }): Promise<RetrievalResult> {
  const limit = input.profile.safeguards.max_candidates;
  const terms = meaningfulTerms(input.query);
  const activeIds = input.store.listActiveChunks(input.profileName).map((chunk) => chunk.id);
  const eligible = (id: string) => input.store.getChunk(id, input.profileName);
  const sqliteChunks = input.store.keywordSearch(input.profileName,input.query,limit);
  const lanceIds = terms.length ? await input.lance.keywordIds(terms.join(" "),limit,input.profileName,activeIds) : [];
  const keywordChunks = [...new Map([...sqliteChunks, ...lanceIds.map(eligible).filter((chunk) => chunk !== undefined)]
    .filter((chunk) => hasLexicalOverlap(`${chunk.heading} ${chunk.text}`, terms)).map((chunk) => [chunk.id, chunk])).values()];

  let vectorIds: string[] = []; let vectorAvailable = false;
  const embedding = input.config.models.embedding;
  try {
    const provider = input.providers.require(input.profile,"embeddings",embedding.provider);
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(),embedding.timeout_ms);
    try {
      const [vector] = await provider.embed([input.query],embedding.model,controller.signal);
      if (vector && vector.length === embedding.dimensions && vector.every(Number.isFinite)) {
        vectorIds = await input.lance.vectorIds(`${embedding.provider}:${embedding.model}:${embedding.revision}:${embedding.dimensions}`,vector,limit,input.profileName,activeIds);
        vectorAvailable = true;
      }
    } finally { clearTimeout(timer); }
  } catch { vectorAvailable = false; }

  const scores = new Map<string, SearchHit>(); const k = 60;
  keywordChunks.forEach((chunk,index) => scores.set(chunk.id,{ chunk,keywordRank:index+1,score:(1/(k+index+1))*chunk.retrievalWeight }));
  vectorIds.forEach((id,index) => {
    const chunk = eligible(id); if (!chunk) return;
    const current = scores.get(id) ?? { chunk,score:0 };
    current.vectorRank=index+1; current.score += (1/(k+index+1))*chunk.retrievalWeight; scores.set(id,current);
  });
  return { hits:[...scores.values()].filter((hit) => eligible(hit.chunk.id)).sort((a,b) => b.score-a.score || a.chunk.id.localeCompare(b.chunk.id)).slice(0,limit),keywordAvailable:true,vectorAvailable };
}
