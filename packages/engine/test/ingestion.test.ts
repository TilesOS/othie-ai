import { rename, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { OthieEngine } from "../src/engine/service.js";
import { admitPath } from "../src/security/paths.js";
import { countTokens } from "../src/tokenizer.js";
import { fixture, waitFor } from "./helpers.js";

const cleanups:string[]=[];afterEach(async()=>{for(const path of cleanups.splice(0))await rm(path,{recursive:true,force:true});});

describe("offline-first ingestion",()=>{
  it("keeps new documents keyword-searchable without Ollama and handles saves, edits, and deletion",async()=>{
    const f=await fixture();cleanups.push(f.root);const path=join(f.docs,"handbook.md");await writeFile(path,"# Vacation\nEmployees may take twenty days of vacation.\n");
    const engine=new OthieEngine(f.config,f.data);await engine.start();
    try{
      await waitFor(()=>engine.store.getDocument(path,"company")?.status==="active");const first=engine.store.listActiveChunks("company");expect(first.length).toBeGreaterThan(0);
      const offline=await engine.context("company",{query:"vacation"});expect(offline.text).toContain("twenty days");expect(offline.status.keywordAvailable).toBe(true);expect(offline.status.vectorAvailable).toBe(false);expect(countTokens(offline.text,"o200k_base")).toBeLessThanOrEqual(500);
      engine.store.enqueue(path,"company","upsert");await waitFor(()=>Number((engine.store.db.prepare("SELECT COUNT(*) AS n FROM jobs").get() as {n:number}).n)===0);expect(engine.store.listActiveChunks("company")).toHaveLength(first.length);const beforeRebuild=engine.store.getDocument(path,"company")!.active_revision_id;engine.store.enqueue(path,"company","rebuild");await waitFor(()=>{const current=engine.store.getDocument(path,"company")?.active_revision_id;return Boolean(current&&current!==beforeRebuild);});expect(engine.store.listActiveChunks("company")).toHaveLength(first.length);
      await writeFile(path,"# Vacation\nEmployees may take thirty days of vacation.\n");engine.store.enqueue(path,"company","upsert");await waitFor(()=>engine.store.listActiveChunks("company").some((chunk)=>chunk.text.includes("thirty days")));const edited=await engine.context("company",{query:"vacation"});expect(edited.text).toContain("thirty days");expect(edited.text).not.toContain("twenty days");
      await unlink(path);engine.store.revokePath(path,"company");expect((await engine.context("company",{query:"vacation"})).status.mode).toBe("empty");
    }finally{await engine.stop();}
  });

  it("never exposes a staged replacement after a crash boundary",async()=>{
    const f=await fixture();cleanups.push(f.root);const path=join(f.docs,"policy.txt");await writeFile(path,"The support window is nine hours.");const engine=new OthieEngine(f.config,f.data);await engine.start();
    try{await waitFor(()=>engine.store.getDocument(path,"company")?.status==="active");const doc=engine.store.getDocument(path,"company")!;engine.store.beginReplacement({documentId:doc.id,revisionId:"staged-only",path,profile:"company",role:"reference",authority:50,weight:1,contentHash:"different",parserVersion:"1",chunkerVersion:"1",mtimeMs:1,size:1});expect(engine.store.listActiveChunks("company")).toHaveLength(0);}finally{await engine.stop();}
  });

  it("rejects exclusions and symlink/path escapes",async()=>{
    const f=await fixture();cleanups.push(f.root);const outside=join(f.root,"outside.md");await writeFile(outside,"secret");expect(await admitPath(outside,f.config.profiles.company!,f.data)).toBeUndefined();const excluded=join(f.docs,"excluded");await import("node:fs/promises").then(({mkdir})=>mkdir(excluded));const file=join(excluded,"secret.md");await writeFile(file,"secret");expect(await admitPath(file,f.config.profiles.company!,f.data)).toBeUndefined();
  });

  it("reconciles renames and newly applied exclusions",async()=>{
    const f=await fixture();cleanups.push(f.root);const oldPath=join(f.docs,"old.md");const newPath=join(f.docs,"new.md");await writeFile(oldPath,"# Naming\nUse the blue label.");const engine=new OthieEngine(f.config,f.data);await engine.start();try{await waitFor(()=>engine.store.getDocument(oldPath,"company")?.status==="active");await rename(oldPath,newPath);await engine.ingestion.reconcile();await waitFor(()=>engine.store.getDocument(newPath,"company")?.status==="active");expect(engine.store.getDocument(oldPath,"company")?.status).toBe("revoked");f.config.profiles.company!.exclusions.push("new.md");await engine.ingestion.reconcile();expect(engine.store.getDocument(newPath,"company")?.status).toBe("revoked");}finally{await engine.stop();}
  });
});
