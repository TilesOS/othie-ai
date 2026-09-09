#!/usr/bin/env node
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { loadConfig } from "../config.js";
import { defaultDataDir, defaultIpcPath } from "../paths.js";
import { requestEngine } from "../engine/ipc.js";
import type { ContextResult } from "../types.js";

export async function startBridge():Promise<McpServer>{
  const configPath=resolve(process.env.OTHIE_CONFIG??process.argv[2]??"config.json");const config=await loadConfig(configPath);const dataDir=config.data_dir??defaultDataDir();const ipcPath=config.ipc_path??defaultIpcPath(dataDir);
  const bridgeId=process.env.OTHIE_BRIDGE_ID;if(!bridgeId)throw new Error("OTHIE_BRIDGE_ID is required");let credential=process.env.OTHIE_BRIDGE_CREDENTIAL;if(!credential&&process.env.OTHIE_BRIDGE_CREDENTIAL_FILE)credential=(await readFile(process.env.OTHIE_BRIDGE_CREDENTIAL_FILE,"utf8")).trim();if(!credential)throw new Error("OTHIE_BRIDGE_CREDENTIAL or OTHIE_BRIDGE_CREDENTIAL_FILE is required");
  const server=new McpServer({name:"othie",title:"Othie",version:"0.1.0"});
  server.registerTool("get_organization_context",{title:"Get organization context",description:"Retrieve source-backed organizational rules and permitted excerpts. The host decides how to use the returned context.",inputSchema:z.object({query:z.string().min(1),profile:z.string().optional(),max_tokens:z.number().int().positive().optional(),synthesize:z.boolean().default(false)})},async(args)=>{
    try{const params={query:args.query,synthesize:args.synthesize,...(args.profile?{profile:args.profile}:{}),...(args.max_tokens!==undefined?{max_tokens:args.max_tokens}:{})};const result=await requestEngine<ContextResult>(ipcPath,{bridgeId,credential,method:"context",params});return {content:[{type:"text" as const,text:result.text}]};}catch(error){return {isError:true,content:[{type:"text" as const,text:error instanceof Error?error.message:"Context request failed"}]};}
  });
  server.registerTool("get_context_status",{title:"Get Othie context status",description:"Read operational indexing and revision status without document contents.",inputSchema:z.object({})},async()=>{
    try{const result=await requestEngine<Record<string,unknown>>(ipcPath,{bridgeId,credential,method:"status"});return {content:[{type:"text" as const,text:JSON.stringify(result)}]};}catch(error){return {isError:true,content:[{type:"text" as const,text:error instanceof Error?error.message:"Status request failed"}]};}
  });
  const transport=new StdioServerTransport();await server.connect(transport);
  const shutdown=async()=>{await server.close();};process.once("SIGINT",()=>void shutdown());process.once("SIGTERM",()=>void shutdown());return server;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)startBridge().catch((error)=>{process.stderr.write(`Othie bridge failed: ${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
