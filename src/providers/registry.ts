import type { KithConfig, KithProfile } from "../config.js";
import { HttpModelProvider } from "./http.js";
import type { ModelProvider } from "./types.js";

export type ProviderOperation = "embeddings" | "extraction" | "synthesis";

export class ProviderRegistry {
  private readonly providers = new Map<string, ModelProvider>();
  constructor(config: KithConfig) {
    for (const endpoint of config.providers) this.providers.set(endpoint.id, new HttpModelProvider(endpoint.id, endpoint));
  }

  require(profile: KithProfile, operation: ProviderOperation, providerId: string): ModelProvider {
    if (!profile.providers[operation].includes(providerId)) throw new Error(`Provider ${providerId} is not authorized for ${operation}`);
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider ${providerId} is not configured`);
    return provider;
  }
}
