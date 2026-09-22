import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ChunkRecord, ProcessingStatus, RuleRecord } from "../types.js";
import { meaningfulTerms } from "../retrieval/terms.js";

interface DocumentRow {
  id: string; path: string; profile: string; active_revision_id: string | null; content_hash: string | null;
  status: ProcessingStatus; mtime_ms: number; size: number; error: string | null;
}

export interface JobRow { id: number; path: string; profile: string; kind: "upsert" | "delete" | "rebuild"; attempts: number }
export type DerivedOperation = "text" | "embeddings" | "extraction";
export interface DerivedJob { id: number; document_id: string; revision_id: string; operation: DerivedOperation; attempts: number; path: string; profile: string }

export class ManifestStore {
  readonly db: DatabaseSync;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, path TEXT NOT NULL, profile TEXT NOT NULL, source_role TEXT NOT NULL,
        authority_priority INTEGER NOT NULL, retrieval_weight REAL NOT NULL,
        active_revision_id TEXT, content_hash TEXT, status TEXT NOT NULL,
        mtime_ms REAL NOT NULL DEFAULT 0, size INTEGER NOT NULL DEFAULT 0, error TEXT,
        updated_at TEXT NOT NULL, UNIQUE(path, profile)
      );
      CREATE TABLE IF NOT EXISTS revisions (
        id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id), content_hash TEXT NOT NULL,
        parser_version TEXT NOT NULL, chunker_version TEXT NOT NULL, status TEXT NOT NULL,
        created_at TEXT NOT NULL, published_at TEXT
      );
      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id), revision_id TEXT NOT NULL REFERENCES revisions(id),
        profile TEXT NOT NULL, source_path TEXT NOT NULL, source_role TEXT NOT NULL,
        authority_priority INTEGER NOT NULL, retrieval_weight REAL NOT NULL,
        heading TEXT NOT NULL, location TEXT NOT NULL, text TEXT NOT NULL, content_hash TEXT NOT NULL, token_count INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS chunks_revision_idx ON chunks(revision_id);
      CREATE INDEX IF NOT EXISTS chunks_profile_idx ON chunks(profile);
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(id UNINDEXED, text, heading, tokenize='unicode61');
      CREATE TABLE IF NOT EXISTS rules (
        id TEXT PRIMARY KEY, profile TEXT NOT NULL, document_id TEXT NOT NULL, revision_id TEXT NOT NULL,
        text TEXT NOT NULL, category TEXT NOT NULL, applicability TEXT NOT NULL, quotation TEXT NOT NULL,
        location TEXT NOT NULL, authority_priority INTEGER NOT NULL, is_global INTEGER NOT NULL,
        model_identity TEXT NOT NULL, prompt_version TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS rules_profile_idx ON rules(profile);
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, profile TEXT NOT NULL, kind TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, available_at INTEGER NOT NULL,
        error TEXT, created_at INTEGER NOT NULL, UNIQUE(path, profile, kind)
      );
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS derived_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, document_id TEXT NOT NULL, revision_id TEXT NOT NULL,
        operation TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
        available_at INTEGER NOT NULL DEFAULT 0, error TEXT, UNIQUE(revision_id, operation)
      );
      INSERT OR IGNORE INTO metadata(key,value) VALUES ('corpus_revision','0'),('rule_revision','0'),('schema_version','1');
    `);
    const columns = this.db.prepare("PRAGMA table_info(jobs)").all() as Array<{name: string}>;
    if (!columns.some((column) => column.name === "rerun")) this.db.exec("ALTER TABLE jobs ADD COLUMN rerun INTEGER NOT NULL DEFAULT 0");
    this.setMetadata("schema_version", "2");
  }

  close(): void { this.db.close(); }

  getRevisionCounters(): { corpus: number; rules: number } {
    const rows = this.db.prepare("SELECT key,value FROM metadata WHERE key IN ('corpus_revision','rule_revision')").all() as Array<{key:string;value:string}>;
    return { corpus: Number(rows.find((row) => row.key === "corpus_revision")?.value ?? 0), rules: Number(rows.find((row) => row.key === "rule_revision")?.value ?? 0) };
  }

  private bump(key: "corpus_revision" | "rule_revision"): void {
    this.db.prepare("UPDATE metadata SET value=CAST(value AS INTEGER)+1 WHERE key=?").run(key);
  }

  getDocument(path: string, profile: string): DocumentRow | undefined {
    return this.db.prepare("SELECT id,path,profile,active_revision_id,content_hash,status,mtime_ms,size,error FROM documents WHERE path=? AND profile=?").get(path, profile) as DocumentRow | undefined;
  }

  beginReplacement(input: { documentId: string; revisionId: string; path: string; profile: string; role: string; authority: number; weight: number; contentHash: string; parserVersion: string; chunkerVersion: string; mtimeMs: number; size: number }): void {
    const now = new Date().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare(`INSERT INTO documents(id,path,profile,source_role,authority_priority,retrieval_weight,active_revision_id,content_hash,status,mtime_ms,size,error,updated_at)
        VALUES(?,?,?,?,?,?,NULL,NULL,'processing',?,?,NULL,?)
        ON CONFLICT(path,profile) DO UPDATE SET active_revision_id=NULL,status='processing',error=NULL,updated_at=excluded.updated_at,
        source_role=excluded.source_role,authority_priority=excluded.authority_priority,retrieval_weight=excluded.retrieval_weight,mtime_ms=excluded.mtime_ms,size=excluded.size`).run(
          input.documentId,input.path,input.profile,input.role,input.authority,input.weight,input.mtimeMs,input.size,now);
      this.db.prepare("INSERT OR REPLACE INTO revisions(id,document_id,content_hash,parser_version,chunker_version,status,created_at) VALUES(?,?,?,?,?,'staging',?)").run(
        input.revisionId,input.documentId,input.contentHash,input.parserVersion,input.chunkerVersion,now);
      this.bump("corpus_revision");
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }

  publishReplacement(documentId: string, revisionId: string, contentHash: string, chunks: ChunkRecord[], operations: DerivedOperation[] = []): void {
    const now = new Date().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const insertChunk = this.db.prepare(`INSERT INTO chunks(id,document_id,revision_id,profile,source_path,source_role,authority_priority,retrieval_weight,heading,location,text,content_hash,token_count)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
      const insertFts = this.db.prepare("INSERT INTO chunks_fts(id,text,heading) VALUES(?,?,?)");
      for (const chunk of chunks) {
        insertChunk.run(chunk.id,chunk.documentId,chunk.revisionId,chunk.profile,chunk.sourcePath,chunk.sourceRole,chunk.authorityPriority,chunk.retrievalWeight,chunk.heading,chunk.location,chunk.text,chunk.contentHash,chunk.tokenCount);
        insertFts.run(chunk.id,chunk.text,chunk.heading);
      }
      this.db.prepare("UPDATE revisions SET status='active',published_at=? WHERE id=?").run(now, revisionId);
      this.db.prepare("UPDATE revisions SET status='superseded' WHERE document_id=? AND id<>? AND status='active'").run(documentId, revisionId);
      this.db.prepare("UPDATE documents SET active_revision_id=?,content_hash=?,status='active',error=NULL,updated_at=? WHERE id=?").run(revisionId,contentHash,now,documentId);
      this.db.prepare("DELETE FROM derived_jobs WHERE document_id=? AND revision_id<>?").run(documentId, revisionId);
      for (const operation of operations) this.ensureDerivedJob(documentId, revisionId, operation);
      this.bump("corpus_revision");
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }

  failReplacement(documentId: string, revisionId: string, status: "failed" | "skipped", error: string): void {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE revisions SET status=? WHERE id=?").run(status, revisionId);
      this.db.prepare("UPDATE documents SET active_revision_id=NULL,status=?,error=?,updated_at=? WHERE id=?").run(status,error.slice(0,1000),new Date().toISOString(),documentId);
      this.db.prepare("DELETE FROM rules WHERE document_id=?").run(documentId);
      this.bump("rule_revision");
      this.db.exec("COMMIT");
    } catch (error2) { this.db.exec("ROLLBACK"); throw error2; }
  }

  revokePath(path: string, profile: string, reason = "deleted or no longer eligible"): void {
    const document = this.getDocument(path, profile);
    if (!document || document.status === "revoked") return;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE documents SET active_revision_id=NULL,status='revoked',error=?,updated_at=? WHERE id=?").run(reason,new Date().toISOString(),document.id);
      this.db.prepare("DELETE FROM rules WHERE document_id=?").run(document.id);
      this.db.prepare("DELETE FROM derived_jobs WHERE document_id=?").run(document.id);
      this.bump("corpus_revision"); this.bump("rule_revision");
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }

  enqueue(path: string, profile: string, kind: "upsert" | "delete" | "rebuild"): void {
    const now = Date.now();
    this.db.prepare(`INSERT INTO jobs(path,profile,kind,state,attempts,available_at,created_at) VALUES(?,?,?,'pending',0,?,?)
      ON CONFLICT(path,profile,kind) DO UPDATE SET
        rerun=CASE WHEN jobs.state='processing' THEN 1 ELSE 0 END,
        state=CASE WHEN jobs.state='processing' THEN 'processing' ELSE 'pending' END,
        attempts=CASE WHEN jobs.state='processing' THEN jobs.attempts ELSE 0 END,
        available_at=excluded.available_at,error=NULL`).run(path,profile,kind,now,now);
  }

  invalidatePath(path: string, profile: string): void {
    const result = this.db.prepare("UPDATE documents SET active_revision_id=NULL,status='pending' WHERE path=? AND profile=? AND status<>'revoked'").run(path, profile);
    if (result.changes) this.bump("corpus_revision");
  }

  listDocuments(profile?: string): DocumentRow[] {
    return (profile ? this.db.prepare("SELECT id,path,profile,active_revision_id,content_hash,status,mtime_ms,size,error FROM documents WHERE profile=?").all(profile) : this.db.prepare("SELECT id,path,profile,active_revision_id,content_hash,status,mtime_ms,size,error FROM documents").all()) as unknown as DocumentRow[];
  }

  getMetadata(key: string): string | undefined { return (this.db.prepare("SELECT value FROM metadata WHERE key=?").get(key) as {value:string}|undefined)?.value; }
  setMetadata(key: string, value: string): void { this.db.prepare("INSERT INTO metadata(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key,value); }

  recoverJobs(): void {
    this.db.prepare("UPDATE jobs SET state='pending',rerun=0 WHERE state='processing'").run();
    this.db.prepare("UPDATE derived_jobs SET state='pending' WHERE state='processing'").run();
  }

  claimJob(): JobRow | undefined {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare(`SELECT id,path,profile,kind,attempts FROM jobs j WHERE state='pending' AND available_at<=?
        AND NOT EXISTS (SELECT 1 FROM jobs busy WHERE busy.path=j.path AND busy.profile=j.profile AND busy.state='processing') ORDER BY id LIMIT 1`).get(Date.now()) as JobRow | undefined;
      if (row) this.db.prepare("UPDATE jobs SET state='processing',attempts=attempts+1 WHERE id=?").run(row.id);
      this.db.exec("COMMIT");
      return row;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }

  completeJob(id: number): void {
    this.db.prepare("DELETE FROM jobs WHERE id=? AND rerun=0").run(id);
    this.db.prepare("UPDATE jobs SET state='pending',rerun=0,attempts=0 WHERE id=? AND rerun=1").run(id);
  }
  retryJob(id: number, error: string, delayMs: number, terminal: boolean): void {
    this.db.prepare("UPDATE jobs SET state=?,available_at=?,error=? WHERE id=?").run(terminal ? "failed" : "pending",Date.now()+delayMs,error.slice(0,1000),id);
  }

  keywordSearch(profile: string, query: string, limit: number): ChunkRecord[] {
    const sanitized = meaningfulTerms(query).map((word) => `"${word}"`).join(" OR ");
    if (!sanitized) return [];
    const rows = this.db.prepare(`SELECT c.* FROM chunks_fts f JOIN chunks c ON c.id=f.id JOIN documents d ON d.id=c.document_id
      WHERE chunks_fts MATCH ? AND c.profile=? AND d.active_revision_id=c.revision_id AND d.status='active'
      ORDER BY bm25(chunks_fts) LIMIT ?`).all(sanitized,profile,limit) as Array<Record<string,unknown>>;
    return rows.map(rowToChunk);
  }

  listActiveChunks(profile: string): ChunkRecord[] {
    const rows = this.db.prepare(`SELECT c.* FROM chunks c JOIN documents d ON d.id=c.document_id WHERE c.profile=? AND d.active_revision_id=c.revision_id AND d.status='active'`).all(profile) as Array<Record<string,unknown>>;
    return rows.map(rowToChunk);
  }

  getChunk(id: string, profile?: string): ChunkRecord | undefined {
    const row = this.db.prepare(`SELECT c.* FROM chunks c JOIN documents d ON d.id=c.document_id WHERE c.id=? AND (? IS NULL OR c.profile=?) AND d.active_revision_id=c.revision_id AND d.status='active'`).get(id,profile??null,profile??null) as Record<string,unknown> | undefined;
    return row ? rowToChunk(row) : undefined;
  }

  replaceRules(documentId: string, revisionId: string, rules: RuleRecord[]): void {
    if (!this.isActiveRevision(documentId, revisionId)) return;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM rules WHERE document_id=?").run(documentId);
      const insert = this.db.prepare(`INSERT INTO rules(id,profile,document_id,revision_id,text,category,applicability,quotation,location,authority_priority,is_global,model_identity,prompt_version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
      for (const rule of rules) insert.run(rule.id,rule.profile,rule.documentId,rule.revisionId,rule.text,rule.category,rule.applicability,rule.quotation,rule.location,rule.authorityPriority,rule.global?1:0,rule.modelIdentity,rule.promptVersion);
      this.bump("rule_revision"); this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }

  listRules(profile: string, globalOnly = false): RuleRecord[] {
    const rows = this.db.prepare(`SELECT r.*,d.path AS source_path FROM rules r JOIN documents d ON d.id=r.document_id WHERE r.profile=? AND d.active_revision_id=r.revision_id AND d.status='active' ${globalOnly ? "AND r.is_global=1" : ""} ORDER BY r.authority_priority DESC,r.id`).all(profile) as Array<Record<string,unknown>>;
    return rows.map(rowToRule);
  }

  status(profiles?:string[]): Record<string, unknown> {
    const placeholders=profiles?.length?profiles.map(()=>"?").join(","):"";const where=placeholders?` WHERE profile IN (${placeholders})`:"";
    const documents = this.db.prepare(`SELECT status,COUNT(*) AS count FROM documents${where} GROUP BY status`).all(...(profiles??[]));
    const jobs = this.db.prepare(`SELECT state,COUNT(*) AS count FROM jobs${where} GROUP BY state`).all(...(profiles??[]));
    const derivedJobs = this.db.prepare(`SELECT j.operation,j.state,COUNT(*) AS count FROM derived_jobs j JOIN documents d ON d.id=j.document_id
      ${placeholders ? `WHERE d.profile IN (${placeholders})` : ""} GROUP BY j.operation,j.state`).all(...(profiles??[]));
    return { revisions: this.getRevisionCounters(), documents, jobs, derivedJobs };
  }

  isActiveRevision(documentId: string, revisionId: string): boolean {
    return Boolean(this.db.prepare("SELECT 1 FROM documents WHERE id=? AND active_revision_id=? AND status='active'").get(documentId, revisionId));
  }

  ensureDerivedJob(documentId: string, revisionId: string, operation: DerivedOperation): void {
    this.db.prepare("INSERT OR IGNORE INTO derived_jobs(document_id,revision_id,operation) VALUES(?,?,?)").run(documentId, revisionId, operation);
  }

  claimDerivedJob(): DerivedJob | undefined {
    const job = this.db.prepare(`SELECT j.id,j.document_id,j.revision_id,j.operation,j.attempts,d.path,d.profile
      FROM derived_jobs j JOIN documents d ON d.id=j.document_id
      WHERE j.state='pending' AND j.available_at<=? AND d.status='active' AND d.active_revision_id=j.revision_id
      ORDER BY j.available_at,j.id LIMIT 1`).get(Date.now()) as DerivedJob | undefined;
    if (job) this.db.prepare("UPDATE derived_jobs SET state='processing',attempts=attempts+1 WHERE id=?").run(job.id);
    return job;
  }

  finishDerivedJob(id: number, error?: string): void {
    if (error) {
      this.db.prepare(`UPDATE derived_jobs SET state='pending',error=?,available_at=? + MIN(30000,250 * (1 << MIN(attempts,7))) WHERE id=?`).run(error.slice(0,1000),Date.now(),id);
    } else {
      this.db.prepare("UPDATE derived_jobs SET state='done',error=NULL WHERE id=?").run(id);
      this.bump("corpus_revision");
    }
  }

  purge(): void {
    this.db.exec("BEGIN IMMEDIATE; DELETE FROM derived_jobs; DELETE FROM chunks_fts; DELETE FROM rules; DELETE FROM chunks; DELETE FROM revisions; DELETE FROM documents; DELETE FROM jobs; UPDATE metadata SET value=CAST(value AS INTEGER)+1 WHERE key IN ('corpus_revision','rule_revision'); COMMIT;");
  }
}

function rowToChunk(row: Record<string, unknown>): ChunkRecord {
  return { id:String(row.id),documentId:String(row.document_id),revisionId:String(row.revision_id),profile:String(row.profile),sourcePath:String(row.source_path),sourceRole:row.source_role as ChunkRecord["sourceRole"],authorityPriority:Number(row.authority_priority),retrievalWeight:Number(row.retrieval_weight),heading:String(row.heading),location:String(row.location),text:String(row.text),contentHash:String(row.content_hash),tokenCount:Number(row.token_count) };
}

function rowToRule(row: Record<string, unknown>): RuleRecord {
  return { id:String(row.id),profile:String(row.profile),documentId:String(row.document_id),revisionId:String(row.revision_id),sourcePath:String(row.source_path),text:String(row.text),category:String(row.category),applicability:String(row.applicability),quotation:String(row.quotation),location:String(row.location),authorityPriority:Number(row.authority_priority),global:Boolean(row.is_global),modelIdentity:String(row.model_identity),promptVersion:String(row.prompt_version) };
}
