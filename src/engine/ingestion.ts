import { createHash } from "node:crypto";
import type { Stats } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { watch, type FSWatcher } from "chokidar";
import type { KithConfig } from "../config.js";
import { chunkSections, sha256 } from "../ingestion/chunker.js";
import { SkippedDocumentError } from "../ingestion/parser.js";
import { parseDocumentIsolated } from "../ingestion/isolated-parser.js";
import type { ProviderRegistry } from "../providers/registry.js";
import { extractRules } from "../rules/extractor.js";
import { admitPath, isGlobalDocument } from "../security/paths.js";
import type { ManifestStore } from "../storage/manifest.js";
import type { LanceIndex } from "../retrieval/lance-index.js";

async function walk(root:string):Promise<string[]>{
  const output:string[]=[]; const pending=[root];
  while(pending.length){const dir=pending.pop()!;let entries;try{entries=await readdir(dir,{withFileTypes:true});}catch{continue;}
    for(const entry of entries){if(entry.name.startsWith(".")||["node_modules","dist","build","coverage",".kith"].includes(entry.name))continue;const path=join(dir,entry.name);if(entry.isDirectory())pending.push(path);else if(entry.isFile())output.push(path);}
  }return output;
}

async function stableRead(path:string):Promise<{bytes:Buffer;fileStat:Stats}>{
  for(let attempt=0;attempt<3;attempt++){const before=await stat(path);const bytes=await readFile(path);const after=await stat(path);if(before.size===after.size&&before.mtimeMs===after.mtimeMs&&bytes.length===after.size)return{bytes,fileStat:after};await new Promise((resolve)=>setTimeout(resolve,100));}
  throw new Error("File changed while being read; retrying after stability check");
}

export class IngestionManager{
  private watcher?:FSWatcher; private timer?:NodeJS.Timeout; private workers:Promise<void>[]=[]; private stopping=false;
  constructor(private readonly config:KithConfig,private readonly dataDir:string,private readonly store:ManifestStore,private readonly lance:LanceIndex,private readonly providers:ProviderRegistry){}

  async start():Promise<void>{
    this.store.recoverJobs(); await this.reconcile();
    if(this.config.ingestion.watch_enabled){const roots=[...new Set(Object.values(this.config.profiles).flatMap((profile)=>profile.sources.map((source)=>source.root)))];
      this.watcher=watch(roots,{ignoreInitial:true,followSymlinks:false,atomic:true,awaitWriteFinish:{stabilityThreshold:500,pollInterval:100}});
      this.watcher.on("add",(path)=>this.queuePath(path,"upsert")).on("change",(path)=>this.queuePath(path,"upsert")).on("unlink",(path)=>this.deletePath(path)).on("error",(error)=>process.stderr.write(`Kith watcher error: ${error instanceof Error?error.message:String(error)}\n`));}
    this.timer=setInterval(()=>void this.reconcile(),this.config.reconciliation_interval_ms); this.timer.unref();
    this.workers=Array.from({length:this.config.ingestion.concurrency},()=>this.worker());
  }

  async stop():Promise<void>{this.stopping=true;if(this.timer)clearInterval(this.timer);await this.watcher?.close();await Promise.all(this.workers);}

  async reconcile():Promise<void>{
    for(const [profileName,profile] of Object.entries(this.config.profiles)){
      const seen=new Set<string>();
      for(const source of profile.sources)for(const path of await walk(source.root)){const admitted=await admitPath(path,profile,this.dataDir);if(admitted){seen.add(admitted.path);this.store.enqueue(admitted.path,profileName,"upsert");}}
      for(const document of this.store.listDocuments(profileName))if(!seen.has(document.path))this.store.revokePath(document.path,profileName);
    }
  }

  rebuild():void{for(const document of this.store.listDocuments())if(document.status!=="revoked")this.store.enqueue(document.path,document.profile,"rebuild");}

  private queuePath(path:string,kind:"upsert"|"rebuild"):void{for(const [name,profile] of Object.entries(this.config.profiles))void admitPath(path,profile,this.dataDir).then((admitted)=>{if(admitted)this.store.enqueue(admitted.path,name,kind);});}
  private deletePath(path:string):void{for(const name of Object.keys(this.config.profiles))this.store.revokePath(path,name);}
  private async worker():Promise<void>{while(!this.stopping){const job=this.store.claimJob();if(!job){await new Promise((resolve)=>setTimeout(resolve,100));continue;}try{if(job.kind==="delete")this.store.revokePath(job.path,job.profile);else await this.process(job.path,job.profile,job.kind==="rebuild");this.store.completeJob(job.id);}catch(error){const terminal=job.attempts+1>=this.config.ingestion.retry_limit;this.store.retryJob(job.id,String(error),Math.min(30_000,250*2**job.attempts),terminal);}}}

  private async process(path:string,profileName:string,force:boolean):Promise<void>{
    const profile=this.config.profiles[profileName];if(!profile)return;const admitted=await admitPath(path,profile,this.dataDir);if(!admitted){this.store.revokePath(path,profileName,"excluded, inaccessible, or escaped allowed roots");return;}
    const {fileStat,bytes}=await stableRead(path);const contentHash=createHash("sha256").update(bytes).digest("hex");const existing=this.store.getDocument(path,profileName);
    if(!force&&existing?.status==="active"&&existing.content_hash===contentHash)return;
    const documentId=existing?.id??sha256(`${profileName}:${path}`);const revisionId=sha256(`${documentId}:${contentHash}:${this.config.parser_version}:${this.config.chunker_version}${force?`:${Date.now()}`:""}`);
    this.store.beginReplacement({documentId,revisionId,path,profile:profileName,role:admitted.source.role,authority:admitted.source.authority_priority,weight:admitted.source.retrieval_weight,contentHash,parserVersion:this.config.parser_version,chunkerVersion:this.config.chunker_version,mtimeMs:fileStat.mtimeMs,size:fileStat.size});
    try{
      const sections=await parseDocumentIsolated(path,this.config.ingestion.max_file_bytes);const chunks=chunkSections({sections,documentId,revisionId,profileName,profile,source:admitted.source,sourcePath:path,config:this.config});
      this.store.publishReplacement(documentId,revisionId,contentHash,chunks);
      try{await this.lance.addText(chunks);}catch{}
      const embedding=this.config.models.embedding;
      try{const provider=this.providers.require(profile,"embeddings",embedding.provider);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),embedding.timeout_ms);try{const vectors=await provider.embed(chunks.map((chunk)=>chunk.text),embedding.model,controller.signal);if(vectors.every((vector)=>vector.length===embedding.dimensions))await this.lance.addVectors(`${embedding.provider}:${embedding.model}:${embedding.revision}:${embedding.dimensions}`,chunks,vectors);}finally{clearTimeout(timer);}}catch{}
      if(admitted.source.role==="authoritative")try{const rules=await extractRules({chunks,profile,config:this.config,providers:this.providers,global:isGlobalDocument(path,admitted.source)});this.store.replaceRules(documentId,revisionId,rules);}catch{}
    }catch(error){this.store.failReplacement(documentId,revisionId,error instanceof SkippedDocumentError?"skipped":"failed",String(error));throw error;}
  }
}
