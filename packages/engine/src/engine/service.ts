import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { OthieConfig } from "../config.js";
import { ContextCompiler } from "../context/compiler.js";
import { IngestionManager } from "./ingestion.js";
import { LanceIndex } from "../retrieval/lance-index.js";
import { ProviderRegistry } from "../providers/registry.js";
import { ManifestStore } from "../storage/manifest.js";
import type { ContextRequest, ContextResult } from "../types.js";

export class OthieEngine{
  readonly store:ManifestStore;readonly lance:LanceIndex;readonly providers:ProviderRegistry;readonly ingestion:IngestionManager;readonly compiler:ContextCompiler;
  constructor(readonly config:OthieConfig,readonly dataDir:string){this.store=new ManifestStore(join(dataDir,"manifest.sqlite"));this.lance=new LanceIndex(dataDir);this.providers=new ProviderRegistry(config);this.ingestion=new IngestionManager(config,dataDir,this.store,this.lance,this.providers);this.compiler=new ContextCompiler(config,this.store,this.lance,this.providers);}
  async start():Promise<void>{await mkdir(this.dataDir,{recursive:true,mode:0o700});const identity=JSON.stringify({parser:this.config.parser_version,chunker:this.config.chunker_version,embedding:this.config.models.embedding,compiler:this.config.models.compiler,profiles:this.config.profiles,ingestion:this.config.ingestion});if(this.store.getMetadata("build_identity")!==identity){this.ingestion.rebuild();this.store.setMetadata("build_identity",identity);}await this.ingestion.start();}
  async stop():Promise<void>{await this.ingestion.stop();await this.lance.close();this.store.close();}
  context(profile:string,request:ContextRequest):Promise<ContextResult>{return this.compiler.get(profile,request);}
  status(profiles?:string[]):Record<string,unknown>{const allowed=profiles??Object.keys(this.config.profiles);return {...this.store.status(allowed),profiles:allowed,pid:process.pid};}
  async purge():Promise<void>{await this.ingestion.stop();this.store.purge();await this.lance.purge();await this.ingestion.start();}
}
