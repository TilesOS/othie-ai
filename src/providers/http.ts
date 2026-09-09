import type { OthieConfig } from "../config.js";
import type { JsonMessage, ModelProvider } from "./types.js";
import { ProviderError } from "./types.js";

function isLoopback(url: URL): boolean { return ["127.0.0.1", "::1", "localhost"].includes(url.hostname); }

async function guardedFetch(endpoint: NonNullable<OthieConfig["providers"]>[number], path: string, init: RequestInit): Promise<Response> {
  const base = new URL(endpoint.base_url);
  if (endpoint.kind === "openai_compatible" && !isLoopback(base) && base.protocol !== "https:") throw new ProviderError("Remote providers require HTTPS", false);
  const target = new URL(path, base.href.endsWith("/") ? base : new URL(`${base.href}/`));
  if (target.origin !== base.origin) throw new ProviderError("Provider path escaped its approved origin", false);
  const response = await fetch(target, { ...init, redirect: "manual" });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new ProviderError("Provider returned an unresolvable redirect", false);
    const next = new URL(location, target);
    const allowed = new Set([base.origin, ...endpoint.allowed_redirect_origins.map((item) => new URL(item).origin)]);
    if (!allowed.has(next.origin) || (!isLoopback(next) && next.protocol !== "https:")) throw new ProviderError("Provider redirect destination is not approved", false);
    throw new ProviderError("Provider redirects are disabled; configure the final approved endpoint", false);
  }
  if (!response.ok) throw new ProviderError(`Provider request failed (${response.status})`, response.status >= 500 || response.status === 429);
  return response;
}

export class HttpModelProvider implements ModelProvider {
  readonly remote: boolean;
  constructor(readonly id: string, private readonly endpoint: OthieConfig["providers"][number]) {
    this.remote = !isLoopback(new URL(endpoint.base_url));
  }

  private headers(): Record<string,string> {
    const headers: Record<string,string> = { "content-type": "application/json" };
    if (this.endpoint.api_key_env) {
      const key = process.env[this.endpoint.api_key_env];
      if (!key) throw new ProviderError(`Credential environment variable ${this.endpoint.api_key_env} is not set`, false);
      headers.authorization = `Bearer ${key}`;
    }
    return headers;
  }

  async embed(texts: string[], model: string, signal: AbortSignal): Promise<number[][]> {
    if (this.endpoint.kind === "ollama") {
      const response = await guardedFetch(this.endpoint, "api/embed", { method: "POST", headers: this.headers(), body: JSON.stringify({ model, input: texts }), signal });
      const data = await response.json() as { embeddings?: number[][] };
      if (!Array.isArray(data.embeddings) || data.embeddings.length !== texts.length) throw new ProviderError("Invalid Ollama embedding response");
      return data.embeddings;
    }
    const response = await guardedFetch(this.endpoint, "v1/embeddings", { method: "POST", headers: this.headers(), body: JSON.stringify({ model, input: texts }), signal });
    const data = await response.json() as { data?: Array<{ index: number; embedding: number[] }> };
    if (!Array.isArray(data.data)) throw new ProviderError("Invalid embedding response");
    return data.data.sort((a,b) => a.index-b.index).map((item) => item.embedding);
  }

  async generateJson(messages: JsonMessage[], model: string, schema: Record<string, unknown>, signal: AbortSignal, options?: { thinking?: boolean }): Promise<unknown> {
    if (this.endpoint.kind === "ollama") {
      const response = await guardedFetch(this.endpoint, "api/chat", { method: "POST", headers: this.headers(), body: JSON.stringify({ model, messages, stream: false, think: options?.thinking ?? false, format: schema }), signal });
      const data = await response.json() as { message?: { content?: string } };
      if (!data.message?.content) throw new ProviderError("Invalid Ollama generation response");
      return JSON.parse(data.message.content) as unknown;
    }
    const response = await guardedFetch(this.endpoint, "v1/chat/completions", { method: "POST", headers: this.headers(), body: JSON.stringify({ model, messages, response_format: { type: "json_schema", json_schema: { name: "othie_output", strict: true, schema } } }), signal });
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new ProviderError("Invalid OpenAI-compatible generation response");
    return JSON.parse(content) as unknown;
  }
}
