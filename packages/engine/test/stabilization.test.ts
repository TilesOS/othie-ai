import { mkdir, readFile, rm, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { OthieEngine } from "../src/engine/service.js";
import { fixture, waitFor } from "./helpers.js";
import type { ChunkRecord, RuleRecord } from "../src/types.js";
import type { ModelProvider } from "../src/providers/types.js";
import { conflictGroups } from "../src/rules/selection.js";
import { countTokens } from "../src/tokenizer.js";

function seed(engine: OthieEngine, profile: string, id: string, text: string, path = `${engine.dataDir}/${id}.md`): ChunkRecord {
  const revisionId = `${id}-revision`;
  engine.store.beginReplacement({ documentId: id, revisionId, path, profile, role: "authoritative", authority: 50, weight: 1, contentHash: id, parserVersion: "1", chunkerVersion: "1", mtimeMs: 1, size: text.length });
  const chunk: ChunkRecord = { id: `${id}-chunk`, documentId: id, revisionId, profile, sourcePath: path, sourceRole: "authoritative", authorityPriority: 50, retrievalWeight: 1, heading: "Policy", location: "paragraph 1", text, contentHash: id, tokenCount: countTokens(text, "o200k_base") };
  engine.store.publishReplacement(id, revisionId, id, [chunk]);
  return chunk;
}
function rule(chunk: ChunkRecord, text = chunk.text): RuleRecord {
  return { id: `${chunk.id}-rule`, profile: chunk.profile, documentId: chunk.documentId, revisionId: chunk.revisionId, sourcePath: chunk.sourcePath, text, quotation: chunk.text, category: "leave", applicability: "employees", location: chunk.location, authorityPriority: 50, global: false, modelIdentity: "ollama:qwen3:4b:test", promptVersion: "rules-v1" };
}
async function idle(engine: OthieEngine): Promise<void> {
  await waitFor(() => Number((engine.store.db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE state IN ('pending','processing')").get() as {n:number}).n) === 0);
}

const localProvider = (generateJson: ModelProvider["generateJson"] = async () => ({ rules: [] })): ModelProvider => ({ id: "ollama", remote: false, embed: async (texts) => texts.map(() => [1, 0]), generateJson });

describe("MVP regression cases", () => {
  it("isolates real Lance FTS/vector results, including top-k and restrictive export policies", async () => {
    const f = await fixture(); f.config.models.embedding.dimensions = 2;
    f.config.profiles.private = structuredClone(f.config.profiles.company!);
    f.config.profiles.private.permitted_exports = "rules_only";
    f.config.profiles.company!.safeguards.max_candidates = 1;
    const engine = new OthieEngine(f.config, f.data);
    try {
      const publicChunk = seed(engine, "company", "public", "Zephyr has twenty vacation days.");
      const privateChunk = seed(engine, "private", "private", "Zephyr PRIVATE_CANARY acquisition payment.");
      await engine.lance.addText([privateChunk, publicChunk]);
      await engine.lance.addVectors("ollama:nomic-embed-text:test:2", [privateChunk, publicChunk], [[1, 0], [.9, .1]]);
      expect(await engine.lance.keywordIds("Zephyr", 1, "company", [publicChunk.id, privateChunk.id])).toEqual([publicChunk.id]);
      expect(await engine.lance.vectorIds("ollama:nomic-embed-text:test:2", [1, 0], 1, "company", [publicChunk.id, privateChunk.id])).toEqual([publicChunk.id]);
      let input = "";
      vi.spyOn(engine.providers, "require").mockReturnValue(localProvider(async (messages) => { input = JSON.stringify(messages); return { text: "Twenty vacation days.", citation_ids: [publicChunk.id] }; }));
      const result = await engine.context("company", { query: "Zephyr", synthesize: true });
      expect(result.text).toContain("vacation"); expect(result.text).not.toContain("PRIVATE_CANARY"); expect(input).not.toContain("PRIVATE_CANARY");
      expect((await engine.context("private", { query: "Zephyr" })).status.mode).toBe("empty");
      // Defense in depth: even an incorrect backend must not bypass manifest profile checks.
      vi.spyOn(engine.lance, "keywordIds").mockResolvedValue([privateChunk.id]);
      vi.spyOn(engine.lance, "vectorIds").mockResolvedValue([privateChunk.id]);
      expect((await engine.context("company", { query: "Zephyr payment" })).text).not.toContain("PRIVATE_CANARY");
    } finally { await engine.stop(); await rm(f.root, { recursive: true, force: true }); }
  });

  it("does not let stale Lance hits replace valid SQLite matches", async () => {
    const f = await fixture(); const engine = new OthieEngine(f.config, f.data);
    try {
      const stale = seed(engine, "company", "old", "Zephyr outdated guidance.");
      await engine.lance.addText([stale]); engine.store.revokePath(stale.sourcePath, "company");
      seed(engine, "company", "current", "Zephyr current guidance.");
      const result = await engine.context("company", { query: "Zephyr" });
      expect(result.text).toContain("current guidance"); expect(result.text).not.toContain("outdated");
    } finally { await engine.stop(); await rm(f.root, { recursive: true, force: true }); }
  });

  it("selects source-backed rules through semantic hits even with no query-word overlap", async () => {
    const f = await fixture(); f.config.models.embedding.dimensions = 2; f.config.profiles.company!.permitted_exports = "rules_only";
    const engine = new OthieEngine(f.config, f.data);
    try {
      const source = seed(engine, "company", "leave", "Employees receive twenty paid days off annually.");
      engine.store.replaceRules(source.documentId, source.revisionId, [rule(source)]);
      vi.spyOn(engine.providers, "require").mockReturnValue(localProvider());
      vi.spyOn(engine.lance, "vectorIds").mockResolvedValue([source.id]);
      const result = await engine.context("company", { query: "PTO entitlement" });
      expect(result.text).toContain("twenty paid days"); expect(result.text).toContain("<rule"); expect(result.text).not.toContain("<excerpt");
    } finally { await engine.stop(); await rm(f.root, { recursive: true, force: true }); }
  });

  it("preserves useful evidence and attached exceptions within 200 and 500 tokens", async () => {
    const f = await fixture(); const engine = new OthieEngine(f.config, f.data);
    try {
      const text = "Employees receive twenty vacation days. Except contractors, who receive ten days. " + Array.from({length: 60}, (_, i) => `The handbook includes reference note number ${i}.`).join(" ");
      const source = seed(engine, "company", "long", text, join(f.docs, "handbook.md"));
      expect(source.tokenCount).toBeGreaterThan(500);
      for (const cap of [200, 500]) {
        const result = await engine.context("company", { query: "vacation", max_tokens: cap });
        expect(result.text).toContain("twenty vacation days"); expect(result.text).toContain("contractors, who receive ten");
        expect(countTokens(result.text, "o200k_base")).toBeLessThanOrEqual(cap);
        expect(Number(/tokens="(\d+)"/.exec(result.text)![1])).toBe(result.status.tokenCount);
        expect(result.status.omittedItems).toBeGreaterThan(0);
      }
      f.config.profiles.company!.token_budget.enabled = false;
      expect((await engine.context("company", { query: "vacation" })).status.omittedItems).toBe(0);
      expect((await engine.context("company", { query: "vacation", max_tokens: 200 })).status.tokenCount).toBeLessThanOrEqual(200);
    } finally { await engine.stop(); await rm(f.root, { recursive: true, force: true }); }
  });

  it("does not invent conflicts between compatible rules", async () => {
    const f = await fixture(); const engine = new OthieEngine(f.config, f.data);
    try {
      const source = seed(engine, "company", "rules", "Employees may use business class.");
      const allow = rule(source), compatible = { ...allow, id: "receipt", text: "Employees must submit receipts." };
      expect(conflictGroups([allow, compatible])).toEqual([]);
      const deny = { ...allow, id: "deny", text: "Employees must not use business class." };
      expect(conflictGroups([allow, deny])).toEqual([[allow.id, "deny"]]);
      expect(conflictGroups([allow, { ...deny, applicability: "domestic flights" }])).toEqual([]);
    } finally { await engine.stop(); await rm(f.root, { recursive: true, force: true }); }
  });

  it("drops a synthesis if its sources were revoked while generation was pending", async () => {
    const f = await fixture(); f.config.models.embedding.dimensions = 2; const engine = new OthieEngine(f.config, f.data);
    try {
      const source = seed(engine, "company", "revocable", "Zephyr has confidential operating hours.");
      vi.spyOn(engine.providers, "require").mockReturnValue(localProvider(async () => {
        engine.store.revokePath(source.sourcePath, "company");
        return { text: "confidential operating hours", citation_ids: [source.id] };
      }));
      const result = await engine.context("company", { query: "Zephyr", synthesize: true });
      expect(result.status.mode).toBe("empty"); expect(result.text).not.toContain("confidential");
    } finally { await engine.stop(); await rm(f.root, { recursive: true, force: true }); }
  });

  it("supports A → B → A and delete/recreate without duplicate active chunks", async () => {
    const f = await fixture(); const path = join(f.docs, "policy.md"); const engine = new OthieEngine(f.config, f.data);
    await writeFile(path, "Employees have twenty vacation days."); await engine.start();
    try {
      await idle(engine); const originalRevision = engine.store.getDocument(path, "company")!.active_revision_id;
      for (const text of ["Employees have thirty vacation days.", "Employees have twenty vacation days."]) {
        await writeFile(path, text); engine.store.enqueue(path, "company", "upsert"); await idle(engine);
        expect(engine.store.getDocument(path, "company")?.status).toBe("active"); expect(engine.store.listActiveChunks("company")).toHaveLength(1);
      }
      expect(engine.store.getDocument(path, "company")!.active_revision_id).not.toBe(originalRevision);
      await unlink(path); engine.store.revokePath(path, "company"); await writeFile(path, "Employees have twenty vacation days.");
      engine.store.enqueue(path, "company", "upsert"); await idle(engine);
      expect((await engine.context("company", { query: "vacation" })).text).toContain("twenty vacation days");
    } finally { await engine.stop(); await rm(f.root, { recursive: true, force: true }); }
  });

  it("persists failed model work and retries after engine/provider recovery without a rebuild", async () => {
    const f = await fixture(); f.config.models.embedding.dimensions = 2; f.config.profiles.company!.sources[0]!.role = "authoritative";
    const path = join(f.docs, "policy.md"); await writeFile(path, "Employees receive twenty vacation days.");
    let engine = new OthieEngine(f.config, f.data);
    vi.spyOn(engine.providers, "require").mockReturnValue({ ...localProvider(), embed: async () => { throw new Error("offline"); }, generateJson: async () => { throw new Error("offline"); } });
    await engine.start();
    try {
      await waitFor(() => Number((engine.store.db.prepare("SELECT COUNT(*) AS n FROM derived_jobs WHERE error IS NOT NULL").get() as {n:number}).n) === 2);
      const revision = engine.store.getDocument(path, "company")!.active_revision_id;
      expect((await engine.context("company", { query: "vacation" })).text).toContain("twenty vacation days");
      await engine.stop(); engine = new OthieEngine(f.config, f.data);
      const embed = vi.fn(async (texts: string[]) => texts.map(() => [1, 0]));
      vi.spyOn(engine.providers, "require").mockReturnValue({ ...localProvider(async (messages) => {
        const id = /<source id="([^"]+)"/.exec(messages[1]!.content)![1]!;
        return { rules: [{ text: "Employees receive twenty vacation days.", category: "leave", applicability: "employees", source_id: id, quotation: "Employees receive twenty vacation days." }] };
      }), embed });
      await engine.start();
      await waitFor(() => engine.store.listRules("company").length === 1 && Number((engine.store.db.prepare("SELECT COUNT(*) AS n FROM derived_jobs WHERE state='done'").get() as {n:number}).n) === 3);
      expect(engine.store.getDocument(path, "company")!.active_revision_id).toBe(revision);
      expect(embed).toHaveBeenCalled(); expect(engine.store.listActiveChunks("company")).toHaveLength(1);
      expect((await engine.context("company", { query: "vacation" })).text).toContain("<rule");
    } finally { await engine.stop(); await rm(f.root, { recursive: true, force: true }); }
  });

  it("keeps a second source job pending until the first claim completes", async () => {
    const f = await fixture(); const engine = new OthieEngine(f.config, f.data);
    try {
      const path = join(f.docs, "policy.md");
      engine.store.enqueue(path, "company", "upsert"); const first = engine.store.claimJob()!;
      engine.store.enqueue(path, "company", "upsert"); engine.store.enqueue(path, "company", "rebuild");
      expect(engine.store.claimJob()).toBeUndefined(); engine.store.completeJob(first.id);
      const next = engine.store.claimJob()!; expect(next).toBeDefined(); engine.store.completeJob(next.id);
      expect(engine.store.claimJob()?.kind).toBe("rebuild");
    } finally { await engine.stop(); await rm(f.root, { recursive: true, force: true }); }
  });
  it("falls back on uncited output and deadlines, then retries a recovered provider", async () => {
    const f = await fixture(); f.config.models.embedding.dimensions = 2; f.config.models.compiler.synthesis_deadline_ms = 30;
    const engine = new OthieEngine(f.config, f.data);
    try {
      const source = seed(engine, "company", "timeouts", "Zephyr employees receive twenty vacation days.");
      let behavior: "uncited" | "slow" | "ready" = "uncited";
      const generate = vi.fn<ModelProvider["generateJson"]>(async (_messages, _model, _schema, signal) => {
        if (behavior === "slow") await new Promise<void>((_, reject) => signal.addEventListener("abort", () => reject(new Error("deadline")), { once: true }));
        return { text: "Twenty vacation days.", citation_ids: behavior === "uncited" ? [] : [source.id] };
      });
      vi.spyOn(engine.providers, "require").mockReturnValue(localProvider(generate));
      expect((await engine.context("company", { query: "Zephyr", synthesize: true })).status.mode).toBe("fallback");
      behavior = "slow";
      const started = performance.now();
      const fallback = await engine.context("company", { query: "Zephyr", synthesize: true });
      expect(performance.now() - started).toBeLessThan(1_000);
      expect(fallback.text).toContain("twenty vacation days"); expect(fallback.status.mode).toBe("fallback");
      behavior = "ready";
      expect((await engine.context("company", { query: "Zephyr", synthesize: true })).status.mode).toBe("synthesized");
      expect(generate).toHaveBeenCalledTimes(3);
    } finally { await engine.stop(); await rm(f.root, { recursive: true, force: true }); }
  });

});
