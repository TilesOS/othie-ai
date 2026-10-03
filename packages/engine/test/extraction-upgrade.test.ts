import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, it } from "vitest";
import { OthieEngine } from "../src/engine/service.js";
import { EXTRACTION_PROMPT_VERSION } from "../src/rules/extractor.js";
import { fixture, waitFor } from "./helpers.js";

it("rebuilds unchanged sources after an extraction prompt upgrade", async () => {
  const f = await fixture();
  f.config.profiles.company!.providers = { embeddings: [], extraction: [], synthesis: [] };
  const path = join(f.docs, "policy.md"); await writeFile(path, "Employees receive twenty vacation days.");
  let engine = new OthieEngine(f.config, f.data);
  try {
    await engine.start();
    await waitFor(() => engine.store.getDocument(path, "company")?.status === "active");
    const first = engine.store.getDocument(path, "company")!.active_revision_id;
    const oldIdentity = JSON.parse(engine.store.getMetadata("build_identity")!) as { extractionPrompt: string };
    expect(oldIdentity.extractionPrompt).toBe(EXTRACTION_PROMPT_VERSION);
    oldIdentity.extractionPrompt = "previous-extraction-prompt";
    engine.store.setMetadata("build_identity", JSON.stringify(oldIdentity));
    await engine.stop(); engine = new OthieEngine(f.config, f.data);
    await engine.start();
    await waitFor(() => engine.store.getDocument(path, "company")?.status === "active" && engine.store.getDocument(path, "company")?.active_revision_id !== first);
    expect(JSON.parse(engine.store.getMetadata("build_identity")!).extractionPrompt).toBe(EXTRACTION_PROMPT_VERSION);
    expect((await engine.context("company", { query: "vacation" })).text).toContain("twenty vacation days");
  } finally { await engine.stop(); await rm(f.root, { recursive: true, force: true }); }
});
