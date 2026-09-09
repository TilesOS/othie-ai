import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

const sourceSchema = z.object({
  root: z.string().min(1),
  role: z.enum(["authoritative", "reference"]).default("reference"),
  authority_priority: z.number().int().min(0).max(100).default(50),
  retrieval_weight: z.number().positive().max(10).default(1),
  global_rule_documents: z.array(z.string()).default([]),
});

const providerPermissionSchema = z.object({
  embeddings: z.array(z.string()).default(["ollama"]),
  extraction: z.array(z.string()).default(["ollama"]),
  synthesis: z.array(z.string()).default(["ollama"]),
});

const profileSchema = z.object({
  sources: z.array(sourceSchema).min(1),
  exclusions: z.array(z.string()).default([]),
  permitted_exports: z.enum(["rules_only", "rules_and_excerpts"]).default("rules_only"),
  providers: providerPermissionSchema.default({
    embeddings: ["ollama"], extraction: ["ollama"], synthesis: ["ollama"],
  }),
  token_budget: z.object({
    enabled: z.boolean().default(true),
    max_tokens: z.number().int().min(80).max(32_000).default(500),
    tokenizer: z.enum(["o200k_base", "cl100k_base"]).default("o200k_base"),
    host_model: z.string().optional(),
  }).default({ enabled: true, max_tokens: 500, tokenizer: "o200k_base" }),
  safeguards: z.object({
    max_query_chars: z.number().int().min(1).max(100_000).default(8_000),
    max_candidates: z.number().int().min(1).max(1_000).default(40),
    max_response_chars: z.number().int().min(1_000).max(1_000_000).default(100_000),
  }).default({ max_query_chars: 8_000, max_candidates: 40, max_response_chars: 100_000 }),
});

const endpointSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["ollama", "openai_compatible"]),
  base_url: z.string().url(),
  api_key_env: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional(),
  allowed_redirect_origins: z.array(z.string().url()).default([]),
});

export const configSchema = z.object({
  version: z.literal(1),
  data_dir: z.string().optional(),
  ipc_path: z.string().optional(),
  credentials_file: z.string().optional(),
  parser_version: z.string().default("1"),
  chunker_version: z.string().default("1"),
  reconciliation_interval_ms: z.number().int().min(1_000).default(60_000),
  ingestion: z.object({
    concurrency: z.number().int().min(1).max(16).default(2),
    max_file_bytes: z.number().int().min(1_024).default(25 * 1024 * 1024),
    chunk_tokens: z.number().int().min(100).max(4_000).default(500),
    overlap_tokens: z.number().int().min(0).max(1_000).default(75),
    retry_limit: z.number().int().min(0).max(20).default(5),
    watch_enabled: z.boolean().default(true),
  }).default({ concurrency: 2, max_file_bytes: 25 * 1024 * 1024, chunk_tokens: 500, overlap_tokens: 75, retry_limit: 5, watch_enabled: true }),
  models: z.object({
    embedding: z.object({ provider: z.string().default("ollama"), model: z.string().default("nomic-embed-text"), revision: z.string().default("configured"), dimensions: z.number().int().positive().default(768), timeout_ms: z.number().int().positive().default(1_500) }).default({ provider: "ollama", model: "nomic-embed-text", revision: "configured", dimensions: 768, timeout_ms: 1_500 }),
    compiler: z.object({ provider: z.string().default("ollama"), model: z.string().default("qwen3:4b"), revision: z.string().default("configured"), thinking: z.boolean().default(false), synthesis_deadline_ms: z.number().int().positive().default(2_000) }).default({ provider: "ollama", model: "qwen3:4b", revision: "configured", thinking: false, synthesis_deadline_ms: 2_000 }),
  }).default({
    embedding: { provider: "ollama", model: "nomic-embed-text", revision: "configured", dimensions: 768, timeout_ms: 1_500 },
    compiler: { provider: "ollama", model: "qwen3:4b", revision: "configured", thinking: false, synthesis_deadline_ms: 2_000 },
  }),
  providers: z.array(endpointSchema).default([{ id: "ollama", kind: "ollama", base_url: "http://127.0.0.1:11434", allowed_redirect_origins: [] }]),
  profiles: z.record(z.string().min(1), profileSchema),
});

export type KithConfig = z.infer<typeof configSchema>;
export type KithProfile = z.infer<typeof profileSchema>;
export type KithSource = z.infer<typeof sourceSchema>;

export async function loadConfig(path: string): Promise<KithConfig> {
  const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
  const config = configSchema.parse(raw);
  const base = resolve(path, "..");
  return {
    ...config,
    data_dir: config.data_dir ? resolve(base, config.data_dir) : undefined,
    credentials_file: config.credentials_file ? resolve(base, config.credentials_file) : undefined,
    profiles: Object.fromEntries(Object.entries(config.profiles).map(([name, profile]) => [name, {
      ...profile,
      sources: profile.sources.map((source) => ({ ...source, root: resolve(base, source.root) })),
    }])),
  };
}
