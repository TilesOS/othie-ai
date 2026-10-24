import { z } from "zod";

// Keep failed or malformed diagnostic output in the raw attempt; never promote it
// to a successful result just because the process exited before its outer timeout.
export const hookDiagnosticSchema = z.object({
  schema_version: z.literal("1"), event: z.literal("othie_prompt_hook"), host: z.enum(["codex", "claude-code"]),
  surface: z.literal("code"), phase: z.literal("turn_start"),
  outcome: z.enum(["injected", "empty", "context_timeout", "context_unavailable", "invalid_event", "invalid_options", "invalid_context_response"]),
  elapsed_ms: z.number().int().nonnegative(),
  mode: z.enum(["deterministic", "synthesized", "fallback", "empty"]).optional(),
  token_count: z.number().int().nonnegative().max(500).optional(),
  omitted_items: z.number().int().nonnegative().optional(), rule_count: z.number().int().nonnegative().optional(),
  excerpt_count: z.number().int().nonnegative().optional(), synthesis_count: z.number().int().nonnegative().optional(),
  conflict_count: z.number().int().nonnegative().optional(),
}).strict();


export function parseHookDiagnostic(stderr: string): z.infer<typeof hookDiagnosticSchema> | null {
  try { return hookDiagnosticSchema.parse(JSON.parse(stderr)); } catch { return null; }
}
