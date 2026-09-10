import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import * as lancedb from "@lancedb/lancedb";
import { sha256 } from "../ingestion/chunker.js";
import type { ChunkRecord } from "../types.js";

export class LanceIndex {
  private connection:Promise<lancedb.Connection>|null=null;
  private mutationTail: Promise<unknown> = Promise.resolve();
  private textMutationCount = 0;
  constructor(private readonly dataDir: string) {}

  private async db(): Promise<lancedb.Connection> {
    if (!this.connection) {
      const path = join(this.dataDir, "lancedb");
      this.connection = mkdir(path, { recursive: true }).then(() => lancedb.connect(path));
    }
    return this.connection;
  }

  async addText(chunks: ChunkRecord[]): Promise<void> {
    return this.mutate(() => this.writeText(chunks));
  }

  private mutate<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationTail.then(operation);
    this.mutationTail = result.catch(() => {});
    return result;
  }

  private async writeText(chunks: ChunkRecord[]): Promise<void> {
    if (!chunks.length) return;
    const db = await this.db(); const names = await db.tableNames();
    const rows = chunks.map((chunk) => ({ id:chunk.id,profile:chunk.profile,revision_id:chunk.revisionId,text:chunk.text,heading:chunk.heading }));
    if (!names.includes("chunks_text")) {
      const table = await db.createTable("chunks_text", rows);
      await table.createIndex("text", { config: lancedb.Index.fts() });
    } else {
      const table = await db.openTable("chunks_text");
      await table.mergeInsert("id").whenMatchedUpdateAll().whenNotMatchedInsertAll().execute(rows);
      this.textMutationCount++;
      if (this.textMutationCount >= 20) { await table.optimize(); this.textMutationCount = 0; }
    }
  }

  async keywordIds(query: string, limit: number, profile: string, activeIds: string[]): Promise<string[]> {
    if (!activeIds.length) return [];
    try {
      const db = await this.db(); if (!(await db.tableNames()).includes("chunks_text")) return [];
      const rows = await (await db.openTable("chunks_text")).search(query,"fts").where(eligibilityFilter(profile, activeIds)).select(["id","_score"]).limit(limit).toArray();
      return rows.map((row) => String(row.id));
    } catch { return []; }
  }

  private vectorTable(identity: string): string { return `vectors_${sha256(identity).slice(0,16)}`; }

  async addVectors(identity: string, chunks: ChunkRecord[], vectors: number[][]): Promise<void> {
    return this.mutate(() => this.writeVectors(identity, chunks, vectors));
  }

  private async writeVectors(identity: string, chunks: ChunkRecord[], vectors: number[][]): Promise<void> {
    if (!chunks.length || chunks.length !== vectors.length) return;
    const db = await this.db(); const tableName = this.vectorTable(identity); const names = await db.tableNames();
    const rows = chunks.map((chunk,index) => ({ id:chunk.id,profile:chunk.profile,revision_id:chunk.revisionId,vector:vectors[index]! }));
    if (!names.includes(tableName)) await db.createTable(tableName, rows);
    else await (await db.openTable(tableName)).mergeInsert("id").whenMatchedUpdateAll().whenNotMatchedInsertAll().execute(rows);
  }

  async vectorIds(identity: string, vector: number[], limit: number, profile: string, activeIds: string[]): Promise<string[]> {
    if (!activeIds.length) return [];
    try {
      const db = await this.db(); const tableName = this.vectorTable(identity); if (!(await db.tableNames()).includes(tableName)) return [];
      const rows = await (await db.openTable(tableName)).vectorSearch(vector).where(eligibilityFilter(profile, activeIds)).select(["id","_distance"]).limit(limit).toArray();
      return rows.map((row) => String(row.id));
    } catch { return []; }
  }

  async purge(): Promise<void> {
    return this.mutate(async () => {
    const db = await this.db();
    for (const name of await db.tableNames()) await db.dropTable(name);
    });
  }
  async close():Promise<void> { await this.mutationTail; (await this.connection)?.close(); this.connection=null; }
}

function eligibilityFilter(profile: string, ids: string[]): string {
  const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
  return `profile = ${literal(profile)} AND id IN (${ids.map(literal).join(",")})`;
}
