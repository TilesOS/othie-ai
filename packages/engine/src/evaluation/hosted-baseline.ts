import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { configSchema } from "../config.js";
import { OthieEngine } from "../engine/service.js";
import { countTokens } from "../tokenizer.js";

export const policies = [
  {
    name: "support.md",
    text: "# Support response policy\nStandard support tickets must receive a first response within four hours on weekdays and twelve hours on weekends. Enterprise support tickets must receive a first response within two hours on weekdays and six hours on weekends. These are first-response targets, not resolution targets.\n",
  },
  {
    name: "refunds.md",
    text: "# Refund window policy\nThe standard refund request window is thirty days after purchase. Acme annual-plan purchases are an exception: refund requests must be made within seven days after purchase. The Acme exception does not apply to monthly plans.\n",
  },
  {
    name: "telemetry.md",
    text: "# Telemetry defaults\nFor users in the EU, product telemetry must default to disabled unless the user has explicitly consented. For users outside the EU, product telemetry may default to enabled. A missing consent value is not explicit consent.\n",
  },
] as const;

const referenceDocuments = [
  {
    name: "facilities.md",
    text: "# Facilities reference\nThe office has bookable desks on the second and third floors. Visitors check in at reception and receive temporary badges. Meeting rooms are named after local parks and can be reserved through the building calendar. Deliveries arriving after business hours are held at the loading desk until the next staffed morning. The facilities team publishes monthly maintenance notices covering elevators, heating, and shared kitchen equipment. A floor map identifies accessible entrances, quiet rooms, first-aid stations, and bicycle storage. This guide describes the building; it does not set customer-facing product requirements.\n",
  },
  {
    name: "events.md",
    text: "# Events reference\nInternal events use a planning checklist for venue capacity, food preferences, accessibility, signage, and audiovisual equipment. Organizers prepare a speaker schedule and a contact sheet before announcing an event. The checklist includes a contingency room for weather and a way to collect anonymous feedback afterward. Volunteers can help with registration, wayfinding, and session timing. Event photos are reviewed by the organizer before publication. This guide is operational background for event planning and is not a statement of product behavior or customer obligations.\n",
  },
  {
    name: "brand.md",
    text: "# Brand reference\nBrand examples favor clear sentences, concrete nouns, and restrained color. Slide decks use a readable type scale and avoid dense paragraphs. Illustrations should support the main point rather than decorate empty space. The design library includes approved logo lockups, monochrome variants, and examples for light and dark surfaces. Writers may use short headings when they help readers scan a page. This guide is reference material for communications; it does not change service commitments, product defaults, or purchase terms.\n",
  },
] as const;

export const cases = [
  {
    id: "support-weekend-exception",
    family: "external-policy",
    task: "A customer opens an enterprise support ticket on Saturday. According to company policy, how many hours may pass before the first response? Return the number only.",
    expected: "6",
  },
  {
    id: "acme-refund-exception",
    family: "customer-exception",
    task: "A customer bought an Acme annual plan. According to company policy, how many days after purchase may they request a refund? Return the number only.",
    expected: "7",
  },
  {
    id: "eu-telemetry-default",
    family: "external-policy",
    task: "For an EU user whose consent value is missing, should product telemetry default to enabled or disabled according to company policy? Return one word.",
    expected: "disabled",
  },
  {
    id: "repository-only-control",
    family: "repository-only-control",
    task: "In the current repository, the function is `export const double = (n) => n * 2`. What does `double(21)` return? Return the number only.",
    expected: "42",
  },
] as const;

type Variant = "baseline" | "full_documents" | "othie";
type Runtime = "openai" | "ollama";
type AnswerFormat = "plain" | "json";
interface ApiUsage { input_tokens?: number; output_tokens?: number; total_tokens?: number }
interface ApiAnswer { answer: string; raw_output: string; usage: ApiUsage; response_id?: string; error?: "invalid_answer" }
interface CaseResult {
  id: string;
  family: string;
  expected: string;
  othie: { mode: string; token_count: number; rules: number; excerpts: number; citation_sources: string[]; context_text: string };
  variants: Record<Variant, ApiAnswer & { correct: boolean }>;
}

const answerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer"],
  properties: { answer: { type: "string" } },
} as const;

function outputText(value: unknown): string {
  if (typeof value !== "object" || value === null || !Array.isArray((value as { output?: unknown }).output)) throw new Error("Invalid model response");
  const output = (value as { output: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> }).output;
  const text = output.flatMap((item) => item.type === "message" ? item.content ?? [] : []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("");
  if (!text) throw new Error("Model returned no answer");
  return text;
}

export function parsedAnswer(rawOutput: string, usage: ApiUsage, responseId?: string, format: AnswerFormat = "json"): ApiAnswer {
  const base = { raw_output: rawOutput, usage, ...(responseId ? { response_id: responseId } : {}) };
  if (format === "plain") return rawOutput.trim() ? { ...base, answer: rawOutput.trim() } : { ...base, answer: "", error: "invalid_answer" };
  try {
    const parsed = JSON.parse(rawOutput) as { answer?: unknown };
    if (typeof parsed.answer === "string") return { ...base, answer: parsed.answer };
  } catch { /* Invalid output is a scored model failure. */ }
  return { ...base, answer: "", error: "invalid_answer" };
}

async function askModel(apiKey: string | undefined, model: string, task: string, runtime: Runtime, format: AnswerFormat, context?: string): Promise<ApiAnswer> {
  const input = [
    { role: "developer", content: `Answer the user's small coding or product-policy question. Use only the supplied repository fact and any supplied company context. If the question requires company policy and none is supplied, answer unknown. ${format === "json" ? "Return the requested value without units in the JSON answer field." : "Reply with the requested value only, without units or explanation."}` },
    ...(context ? [{ role: "developer", content: context }] : []),
    { role: "user", content: task },
  ];
  if (runtime === "ollama") {
    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages: input.map((message) => ({ ...message, role: message.role === "developer" ? "system" : message.role })),
        stream: false, think: false, ...(format === "json" ? { format: answerSchema } : {}), options: { temperature: 0, num_predict: format === "json" ? 512 : 64 } }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error(`Ollama model request failed (${response.status})`);
    const value = await response.json() as { done?: boolean; message?: { content?: string }; prompt_eval_count?: number; eval_count?: number };
    if (!value.done || !value.message?.content) throw new Error("Ollama returned no completed answer");
    const usage = {
      ...(typeof value.prompt_eval_count === "number" ? { input_tokens: value.prompt_eval_count } : {}),
      ...(typeof value.eval_count === "number" ? { output_tokens: value.eval_count } : {}),
    };
    return parsedAnswer(value.message.content, usage, undefined, format);
  }
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for the hosted runtime");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model, input, reasoning: { effort: "none" }, max_output_tokens: format === "json" ? 160 : 64, store: false,
      ...(format === "json" ? { text: { format: { type: "json_schema", name: "othie_eval_answer", strict: true, schema: answerSchema } } } : {}) }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Host model request failed (${response.status})`);
  const value = await response.json() as { id?: string; status?: string; output?: unknown; usage?: ApiUsage };
  if (value.status !== "completed") throw new Error(`Host model response ${value.status ?? "invalid"}`);
  return parsedAnswer(outputText(value), value.usage ?? {}, value.id, format);
}

export function scoreAnswer(answer: string, expected: string): boolean {
  return answer.trim().toLowerCase().replace(/[.!]$/, "") === expected;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function waitUntilIndexed(engine: OthieEngine, deadlineMs: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < deadlineMs) {
    const active = engine.store.listDocuments("company").filter((document) => document.status === "active").length;
    const extraction = engine.store.db.prepare("SELECT state,COUNT(*) AS count FROM derived_jobs WHERE operation='extraction' GROUP BY state").all() as Array<{ state: string; count: number }>;
    const done = extraction.find((row) => row.state === "done")?.count ?? 0;
    if (active === policies.length + referenceDocuments.length && done === policies.length) return;
    const repeatedlyFailed = engine.store.db.prepare("SELECT attempts,error FROM derived_jobs WHERE operation='extraction' AND state='pending' AND attempts>=3 AND error IS NOT NULL LIMIT 1").get() as { attempts: number; error: string } | undefined;
    if (repeatedlyFailed) {
      const status = /Provider request failed \((\d{3})\)/.exec(repeatedlyFailed.error)?.[1];
      throw new Error(`Synthetic policy extraction failed repeatedly${status ? ` (HTTP ${status})` : ""}`);
    }
    await new Promise((doneWaiting) => setTimeout(doneWaiting, 100));
  }
  throw new Error("Synthetic policy extraction did not complete before the deadline");
}

export async function runHostedBaseline(apiKey: string | undefined, model: string, outputPath: string, runtime: Runtime = "openai", contextTokenCap = 500, caseId?: string, answerFormat: AnswerFormat = "plain"): Promise<{ path: string; results: CaseResult[] }> {
  const root = await mkdtemp(join(tmpdir(), "othie-hosted-eval-"));
  const docs = join(root, "docs"), references = join(root, "references"), state = join(root, "state");
  await mkdir(docs); await mkdir(references); await mkdir(state);
  for (const policy of policies) await writeFile(join(docs, policy.name), policy.text);
  for (const document of referenceDocuments) await writeFile(join(references, document.name), document.text);
  const providerId = runtime === "openai" ? "openai" : "ollama";
  const config = configSchema.parse({
    version: 1, data_dir: state, ingestion: { concurrency: 2, chunk_tokens: 500, overlap_tokens: 0, watch_enabled: false },
    models: { embedding: { provider: "none", model: "none", revision: "none", dimensions: 1, timeout_ms: 100 }, compiler: { provider: providerId, model, revision: "eval-1", thinking: false, synthesis_deadline_ms: 10_000 } },
    providers: [runtime === "openai"
      ? { id: "openai", kind: "openai_compatible", base_url: "https://api.openai.com", api_key_env: "OPENAI_API_KEY", allowed_redirect_origins: [] }
      : { id: "ollama", kind: "ollama", base_url: "http://127.0.0.1:11434", allowed_redirect_origins: [] }],
    profiles: { company: { sources: [{ root: docs, role: "authoritative", authority_priority: 80, retrieval_weight: 1, global_rule_documents: [] }, { root: references, role: "reference", authority_priority: 30, retrieval_weight: 1, global_rule_documents: [] }], permitted_exports: "rules_and_excerpts", providers: { embeddings: [], extraction: [providerId], synthesis: [providerId] }, token_budget: { enabled: true, max_tokens: 500, tokenizer: "o200k_base" } } },
  });
  const engine = new OthieEngine(config, state);
  try {
    await engine.start();
    await waitUntilIndexed(engine, runtime === "ollama" ? 180_000 : 90_000);
    const fullDocuments = [...policies, ...referenceDocuments].map((document) => `${document.name}:\n${document.text}`).join("\n");
    const results: CaseResult[] = [];
    const selectedCases = caseId ? cases.filter((scenario) => scenario.id === caseId) : cases;
    if (!selectedCases.length) throw new Error("Unknown evaluation case");
    for (const scenario of selectedCases) {
      const context = await engine.context("company", { query: scenario.task, surface: "code", phase: "turn_start", host: "model-eval", max_tokens: contextTokenCap });
      const citationSources = new Set([...context.brief.applicable_rules.map((rule) => rule.citation.source), ...context.brief.permitted_excerpts.map((excerpt) => excerpt.citation.source)]);
      const variants: CaseResult["variants"] = {} as CaseResult["variants"];
      for (const [variant, supplied] of [["baseline", undefined], ["full_documents", fullDocuments], ["othie", context.status.mode === "empty" ? undefined : context.text]] as const) {
        const answer = await askModel(apiKey, model, scenario.task, runtime, answerFormat, supplied);
        variants[variant] = { ...answer, correct: scoreAnswer(answer.answer, scenario.expected) };
        process.stderr.write(`Evaluated ${scenario.id} / ${variant}\n`);
      }
      results.push({ id: scenario.id, family: scenario.family, expected: scenario.expected,
        othie: { mode: context.status.mode, token_count: context.status.tokenCount, rules: context.brief.applicable_rules.length, excerpts: context.brief.permitted_excerpts.length, citation_sources: [...citationSources], context_text: context.text }, variants });
    }
    const report = { recorded_at: new Date().toISOString(), synthetic_only: true, runtime, model, compiler_model: model, context_token_cap: contextTokenCap, answer_format: answerFormat,
      protocol: "Same model, task wording, and answer format across three conditions. Othie uses model extraction and keyword retrieval; no embeddings or synthesis. This is a small component evaluation, not an end-to-end agent benchmark.",
      full_document_tokens: countTokens(fullDocuments, "o200k_base"), results };
    await mkdir(resolve(outputPath, ".."), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    return { path: outputPath, results };
  } finally {
    await engine.stop();
    await rm(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const runtime = argument("runtime") === "ollama" ? "ollama" : "openai";
  const key = process.env.OPENAI_API_KEY;
  if (runtime === "openai" && !key) { process.stderr.write("OPENAI_API_KEY is required\n"); process.exitCode = 1; }
  else {
    const model = argument("model") ?? (runtime === "openai" ? "gpt-5.6-terra" : "qwen3.5:4b-mlx");
    const answerFormat = argument("answer-format") === "json" ? "json" : "plain";
    const requestedCap = Number(argument("context-tokens") ?? 500);
    if (!Number.isSafeInteger(requestedCap) || requestedCap < 80 || requestedCap > 500) throw new Error("--context-tokens must be an integer from 80 to 500");
    const defaultResults = fileURLToPath(new URL(import.meta.url.includes("/dist/") ? "../../../evaluation/results/" : "../../evaluation/results/", import.meta.url));
    const outputPath = resolve(argument("out") ?? join(defaultResults, `${runtime}-${new Date().toISOString().replaceAll(":", "-")}.json`));
    void runHostedBaseline(key, model, outputPath, runtime, requestedCap, argument("case"), answerFormat).then(({ path, results }) => {
      const tally = (variant: Variant) => results.filter((result) => result.variants[variant].correct).length;
      process.stdout.write(`${JSON.stringify({ report: path, runtime, model, cases: results.length, correct: { baseline: tally("baseline"), full_documents: tally("full_documents"), othie: tally("othie") } }, null, 2)}\n`);
    }).catch((error) => { process.stderr.write(`Model evaluation failed: ${error instanceof Error ? error.message : "unknown error"}\n`); process.exitCode = 1; });
  }
}
