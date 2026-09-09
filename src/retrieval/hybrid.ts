import type { KithConfig, KithProfile } from "../config.js";
import type { ManifestStore } from "../storage/manifest.js";
import type { ProviderRegistry } from "../providers/registry.js";
import type { LanceIndex } from "./lance-index.js";
import type { SearchHit } from "../types.js";

export interface RetrievalResult { hits: SearchHit[]; keywordAvailable: boolean; vectorAvailable: boolean }

export async function hybridRetrieve(input: { query: string; profileName: string; profile: KithProfile; config: KithConfig; store: ManifestStore; lance: LanceIndex; providers: ProviderRegistry }): Promise<RetrievalResult> {
  const limit = input.profile.safeguards.max_candidates;
  let keywordChunks = input.store.keywordSearch(input.profileName,input.query,limit);
  const lanceIds = await input.lance.keywordIds(input.query,limit);
  if (lanceIds.length) keywordChunks = lanceIds.map((id) => input.store.getChunk(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));

  let vectorIds: string[] = []; let vectorAvailable = false;
  const embedding = input.config.models.embedding;
  try {
    const provider = input.providers.require(input.profile,"embeddings",embedding.provider);
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(),embedding.timeout_ms);
    try {
      const [vector] = await provider.embed([input.query],embedding.model,controller.signal);
      if (vector) { vectorIds = await input.lance.vectorIds(`${embedding.provider}:${embedding.model}:${embedding.revision}:${embedding.dimensions}`,vector,limit); vectorAvailable = true; }
    } finally { clearTimeout(timer); }
  } catch { vectorAvailable = false; }

  const scores = new Map<string, SearchHit>(); const k = 60;
  keywordChunks.forEach((chunk,index) => scores.set(chunk.id,{ chunk,keywordRank:index+1,score:(1/(k+index+1))*chunk.retrievalWeight }));
  vectorIds.forEach((id,index) => {
    const chunk = input.store.getChunk(id); if (!chunk) return;
    const current = scores.get(id) ?? { chunk,score:0 };
    current.vectorRank=index+1; current.score += (1/(k+index+1))*chunk.retrievalWeight; scores.set(id,current);
  });
  return { hits:[...scores.values()].sort((a,b) => b.chunk.authorityPriority-a.chunk.authorityPriority || b.score-a.score || a.chunk.id.localeCompare(b.chunk.id)).slice(0,limit),keywordAvailable:true,vectorAvailable };
}
