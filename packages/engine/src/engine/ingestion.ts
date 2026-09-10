import { createHash, randomUUID } from "node:crypto";
import type { Stats } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { watch, type FSWatcher } from "chokidar";
import type { OthieConfig } from "../config.js";
import { chunkSections, sha256 } from "../ingestion/chunker.js";
import { SkippedDocumentError } from "../ingestion/parser.js";
import { parseDocumentIsolated } from "../ingestion/isolated-parser.js";
import type { ProviderRegistry } from "../providers/registry.js";
import { extractRules } from "../rules/extractor.js";
import { admitPath, isGlobalDocument } from "../security/paths.js";
import type { DerivedJob, DerivedOperation, ManifestStore } from "../storage/manifest.js";
import type { LanceIndex } from "../retrieval/lance-index.js";

async function walk(root: string): Promise<string[]> {
  const output: string[] = [], pending = [root];
  while (pending.length) {
    const dir = pending.pop()!;
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.name.startsWith(".") || ["node_modules", "dist", "build", "coverage", ".othie", ".kith"].includes(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile()) output.push(path);
    }
  }
  return output;
}

async function stableRead(path: string, maxBytes: number): Promise<{ bytes: Buffer; fileStat: Stats }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await stat(path);
    if (before.size > maxBytes) throw new SkippedDocumentError("oversized", `File exceeds ${maxBytes} bytes`);
    const bytes = await readFile(path), after = await stat(path);
    if (before.size === after.size && before.mtimeMs === after.mtimeMs && bytes.length === after.size) return { bytes, fileStat: after };
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("File changed while being read");
}

export class IngestionManager {
  private watcher?: FSWatcher;
  private timer?: NodeJS.Timeout;
  private workers: Promise<void>[] = [];
  private reconciliation: Promise<void> | undefined;
  private readonly events = new Set<Promise<void>>();
  private stopping = false;
  private shutdown = new AbortController();

  constructor(private readonly config: OthieConfig, private readonly dataDir: string, private readonly store: ManifestStore, private readonly lance: LanceIndex, private readonly providers: ProviderRegistry) {}

  async start(): Promise<void> {
    this.stopping = false;
    this.shutdown = new AbortController();
    this.store.recoverJobs();
    if (this.config.ingestion.watch_enabled) {
      const roots = [...new Set(Object.values(this.config.profiles).flatMap((profile) => profile.sources.map((source) => source.root)))];
      this.watcher = watch(roots, { ignoreInitial: true, followSymlinks: false, atomic: true, awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 } });
      this.watcher.on("add", (path) => this.queuePath(path)).on("change", (path) => this.queuePath(path))
        .on("unlink", (path) => this.deletePath(path))
        .on("error", () => process.stderr.write("Othie watcher error; reconciliation will retry\n"));
      await new Promise<void>((resolve, reject) => { this.watcher!.once("ready", resolve); this.watcher!.once("error", reject); });
    }
    await this.reconcile();
    this.timer = setInterval(() => { void this.reconcile().catch(() => process.stderr.write("Othie reconciliation failed; retry scheduled\n")); }, this.config.reconciliation_interval_ms);
    this.timer.unref();
    this.workers = Array.from({ length: this.config.ingestion.concurrency }, () => this.worker());
  }

  async stop(): Promise<void> {
    this.stopping = true;
    this.shutdown.abort();
    if (this.timer) clearInterval(this.timer);
    await this.watcher?.close();
    await this.reconciliation;
    await Promise.all(this.events);
    await Promise.all(this.workers);
  }

  reconcile(): Promise<void> {
    if (this.stopping) return Promise.resolve();
    if (!this.reconciliation) this.reconciliation = this.scan().finally(() => { this.reconciliation = undefined; });
    return this.reconciliation;
  }

  private async scan(): Promise<void> {
    for (const [profileName, profile] of Object.entries(this.config.profiles)) {
      const seen = new Set<string>();
      for (const source of profile.sources) for (const path of await walk(source.root)) {
        const admitted = await admitPath(path, profile, this.dataDir);
        if (admitted && !seen.has(admitted.path)) { seen.add(admitted.path); this.store.enqueue(admitted.path, profileName, "upsert"); }
      }
      for (const document of this.store.listDocuments(profileName)) if (!seen.has(document.path)) this.store.revokePath(document.path, profileName);
    }
  }

  rebuild(): void {
    for (const document of this.store.listDocuments()) if (document.status !== "revoked") this.store.enqueue(document.path, document.profile, "rebuild");
  }

  private queuePath(path: string): void {
    if (this.stopping) return;
    const work = Promise.all(Object.entries(this.config.profiles).map(async ([name, profile]) => {
      const admitted = await admitPath(path, profile, this.dataDir);
      if (admitted) { this.store.invalidatePath(admitted.path, name); this.store.enqueue(admitted.path, name, "upsert"); }
      else this.store.revokePath(path, name);
    })).then(() => {}).catch(() => { process.stderr.write("Othie watch event deferred to reconciliation\n"); });
    this.events.add(work);
    void work.finally(() => this.events.delete(work));
  }

  private deletePath(path: string): void {
    for (const name of Object.keys(this.config.profiles)) this.store.revokePath(path, name);
  }

  private async worker(): Promise<void> {
    while (!this.stopping) {
      const job = this.store.claimJob();
      if (job) {
        try {
          if (job.kind === "delete") this.store.revokePath(job.path, job.profile);
          else await this.process(job.path, job.profile, job.kind === "rebuild");
          this.store.completeJob(job.id);
        } catch (error) {
          this.store.retryJob(job.id, String(error), Math.min(30_000, 250 * 2 ** Math.min(job.attempts, 7)), job.attempts + 1 >= this.config.ingestion.retry_limit);
        }
        continue;
      }
      const derived = this.store.claimDerivedJob();
      if (derived) {
        try { await this.processDerived(derived); this.store.finishDerivedJob(derived.id); }
        catch (error) { this.store.finishDerivedJob(derived.id, String(error)); }
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  private operations(profileName: string, authoritative: boolean): DerivedOperation[] {
    const profile = this.config.profiles[profileName]!;
    const operations: DerivedOperation[] = ["text"];
    if (profile.providers.embeddings.includes(this.config.models.embedding.provider)) operations.push("embeddings");
    if (authoritative && profile.providers.extraction.includes(this.config.models.compiler.provider)) operations.push("extraction");
    return operations;
  }

  private async process(path: string, profileName: string, force: boolean): Promise<void> {
    const profile = this.config.profiles[profileName];
    if (!profile) return;
    const admitted = await admitPath(path, profile, this.dataDir);
    if (!admitted) { this.store.revokePath(path, profileName); return; }
    const { fileStat, bytes } = await stableRead(path, this.config.ingestion.max_file_bytes);
    const contentHash = createHash("sha256").update(bytes).digest("hex");
    const existing = this.store.getDocument(path, profileName);
    const operations = this.operations(profileName, admitted.source.role === "authoritative");
    if (!force && existing?.status === "active" && existing.content_hash === contentHash) {
      // Also repairs unfinished derived work in databases created before the durable queue.
      for (const operation of operations) this.store.ensureDerivedJob(existing.id, existing.active_revision_id!, operation);
      return;
    }
    const documentId = existing?.id ?? sha256(`${profileName}:${path}`);
    // A publication is a new generation even when a user restores historical content.
    const revisionId = randomUUID();
    this.store.beginReplacement({ documentId, revisionId, path, profile: profileName, role: admitted.source.role, authority: admitted.source.authority_priority, weight: admitted.source.retrieval_weight, contentHash, parserVersion: this.config.parser_version, chunkerVersion: this.config.chunker_version, mtimeMs: fileStat.mtimeMs, size: fileStat.size });
    try {
      const sections = await parseDocumentIsolated(path, this.config.ingestion.max_file_bytes, bytes);
      const chunks = chunkSections({ sections, documentId, revisionId, profileName, profile, source: admitted.source, sourcePath: path, config: this.config });
      // A watcher revocation/change during parsing must win over this older generation.
      if (this.store.getDocument(path, profileName)?.status !== "processing") return;
      const current = await stat(path).catch(() => undefined);
      if (!current) { this.store.revokePath(path, profileName); return; }
      if (current.size !== fileStat.size || current.mtimeMs !== fileStat.mtimeMs) {
        this.store.invalidatePath(path, profileName); this.store.enqueue(path, profileName, "upsert"); return;
      }
      this.store.publishReplacement(documentId, revisionId, contentHash, chunks, operations);
    } catch (error) {
      this.store.failReplacement(documentId, revisionId, error instanceof SkippedDocumentError ? "skipped" : "failed", String(error));
      throw error;
    }
  }

  private async processDerived(job: DerivedJob): Promise<void> {
    const profile = this.config.profiles[job.profile];
    if (!profile || !this.store.isActiveRevision(job.document_id, job.revision_id)) return;
    const admitted = await admitPath(job.path, profile, this.dataDir);
    if (!admitted) { this.store.revokePath(job.path, job.profile); return; }
    const chunks = this.store.listActiveChunks(job.profile).filter((chunk) => chunk.revisionId === job.revision_id);
    if (job.operation === "text") { await this.lance.addText(chunks); return; }
    if (job.operation === "embeddings") {
      const model = this.config.models.embedding;
      const provider = this.providers.require(profile, "embeddings", model.provider);
      for (let offset = 0; offset < chunks.length; offset += 16) {
        const batch = chunks.slice(offset, offset + 16);
        const signal = AbortSignal.any([this.shutdown.signal, AbortSignal.timeout(model.timeout_ms)]);
        const vectors = await provider.embed(batch.map((chunk) => chunk.text), model.model, signal);
        if (vectors.length !== batch.length || vectors.some((vector) => vector.length !== model.dimensions || !vector.every(Number.isFinite))) throw new Error("Invalid embedding dimensions or values");
        if (!this.store.isActiveRevision(job.document_id, job.revision_id)) return;
        await this.lance.addVectors(`${model.provider}:${model.model}:${model.revision}:${model.dimensions}`, batch, vectors);
      }
      return;
    }
    const rules = [];
    for (const chunk of chunks) {
      rules.push(...await extractRules({ chunks: [chunk], profile, config: this.config, providers: this.providers, global: isGlobalDocument(job.path, admitted.source), signal: this.shutdown.signal }));
    }
    this.store.replaceRules(job.document_id, job.revision_id, [...new Map(rules.map((rule) => [rule.id, rule])).values()]);
  }
}
