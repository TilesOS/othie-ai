import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configSchema, type KithConfig } from "../src/config.js";

export async function fixture(overrides:Record<string,unknown>={}):Promise<{root:string;docs:string;data:string;configPath:string;config:KithConfig}>{
  const root=await mkdtemp(join("/private/tmp","kith-test-"));const docs=join(root,"docs");const data=join(root,"state");await mkdir(docs);await mkdir(data);
  const raw={version:1,data_dir:data,credentials_file:join(data,"credentials.json"),ipc_path:join(data,"engine.sock"),reconciliation_interval_ms:60_000,ingestion:{concurrency:2,max_file_bytes:1_000_000,chunk_tokens:120,overlap_tokens:20,retry_limit:2,watch_enabled:false},models:{embedding:{provider:"ollama",model:"nomic-embed-text",revision:"test",dimensions:768,timeout_ms:50},compiler:{provider:"ollama",model:"qwen3:4b",revision:"test",thinking:false,synthesis_deadline_ms:100}},providers:[{id:"ollama",kind:"ollama",base_url:"http://127.0.0.1:9",allowed_redirect_origins:[]}],profiles:{company:{sources:[{root:docs,role:"reference",authority_priority:50,retrieval_weight:1,global_rule_documents:[]}],exclusions:["excluded/**"],permitted_exports:"rules_and_excerpts",providers:{embeddings:["ollama"],extraction:["ollama"],synthesis:["ollama"]},token_budget:{enabled:true,max_tokens:500,tokenizer:"o200k_base"},safeguards:{max_query_chars:8000,max_candidates:40,max_response_chars:100000}}},...overrides};
  const config=configSchema.parse(raw);const configPath=join(root,"config.json");await writeFile(configPath,JSON.stringify(config));return{root,docs,data,configPath,config};
}

export async function waitFor(test:()=>boolean|Promise<boolean>,timeout=8_000):Promise<void>{const started=Date.now();while(Date.now()-started<timeout){if(await test())return;await new Promise((resolve)=>setTimeout(resolve,50));}throw new Error("Timed out waiting for condition");}
