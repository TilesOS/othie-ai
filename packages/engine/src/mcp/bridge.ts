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

export const CONTEXT_REQUEST_LIMITS = {
  hostChars: 128,
  pathChars: 4_096,
  activePaths: 64,
} as const;

const nonBlankBounded = (max: number) => z.string().min(1).max(max).refine((value) => value.trim().length > 0, "must not be blank");
const citationSchema = z.object({ source: z.string(), at: z.string(), quote: z.string().optional() });
const contextStatusSchema = z.object({
  profile: z.string(),
  mode: z.enum(["deterministic", "synthesized", "fallback", "empty"]),
  tokenizer: z.string(),
  tokenizerEstimate: z.boolean(),
  tokenCount: z.number().int().nonnegative(),
  omittedItems: z.number().int().nonnegative(),
  conflicts: z.number().int().nonnegative(),
  keywordAvailable: z.boolean(),
  vectorAvailable: z.boolean(),
  synthesisAttempted: z.boolean(),
  synthesisReason: z.string().optional(),
  corpusRevision: z.number().int().nonnegative(),
  ruleRevision: z.number().int().nonnegative(),
});
const contextBriefSchema = z.object({
  schema_version: z.literal("1"),
  request: z.object({
    surface: z.enum(["code", "chat", "work", "unknown"]),
    phase: z.enum(["turn_start", "on_demand", "post_discovery"]),
    host: z.string().optional(),
    workspace_root: z.string().optional(),
    active_paths: z.array(z.string()).optional(),
  }),
  context_text: z.string(),
  applicable_rules: z.array(z.object({ id: z.string(), text: z.string(), category: z.string(), scope: z.string(), authority: z.number(), citation: citationSchema })),
  permitted_excerpts: z.array(z.object({ id: z.string(), text: z.string(), citation: citationSchema })),
  synthesis: z.object({ text: z.string(), citations: z.array(citationSchema) }).optional(),
  external_facts: z.array(z.unknown()).max(0),
  navigation_hints: z.array(z.unknown()).max(0),
  verification_checks: z.array(z.unknown()).max(0),
  conflicts: z.array(z.object({ rule_ids: z.array(z.string()), detection: z.literal("explicit_opposition_only") })),
  status: contextStatusSchema,
});

export async function startBridge():Promise<McpServer>{
  const configPath=resolve(process.env.OTHIE_CONFIG??process.argv[2]??"config.json");const config=await loadConfig(configPath);const dataDir=config.data_dir??defaultDataDir();const ipcPath=config.ipc_path??defaultIpcPath(dataDir);
  const bridgeId=process.env.OTHIE_BRIDGE_ID;if(!bridgeId)throw new Error("OTHIE_BRIDGE_ID is required");let credential=process.env.OTHIE_BRIDGE_CREDENTIAL;if(!credential&&process.env.OTHIE_BRIDGE_CREDENTIAL_FILE)credential=(await readFile(process.env.OTHIE_BRIDGE_CREDENTIAL_FILE,"utf8")).trim();if(!credential)throw new Error("OTHIE_BRIDGE_CREDENTIAL or OTHIE_BRIDGE_CREDENTIAL_FILE is required");
  const server=new McpServer({name:"othie",title:"Othie",version:"0.1.0"});
  server.registerTool("get_organization_context",{title:"Get organization context",description:"Retrieve source-backed organizational rules and permitted excerpts. The host decides how to use the returned context.",inputSchema:z.object({
    query:z.string().min(1),profile:z.string().optional(),max_tokens:z.number().int().positive().optional(),synthesize:z.boolean().default(false),
    schema_version:z.literal("1").optional(),surface:z.enum(["code","chat","work","unknown"]).optional(),phase:z.enum(["turn_start","on_demand","post_discovery"]).optional(),
    host:nonBlankBounded(CONTEXT_REQUEST_LIMITS.hostChars).optional(),workspace_root:nonBlankBounded(CONTEXT_REQUEST_LIMITS.pathChars).optional(),
    active_paths:z.array(nonBlankBounded(CONTEXT_REQUEST_LIMITS.pathChars)).min(1).max(CONTEXT_REQUEST_LIMITS.activePaths).optional(),
  }),outputSchema:contextBriefSchema},async(args)=>{
    try{const params={query:args.query,synthesize:args.synthesize,...(args.profile?{profile:args.profile}:{}),...(args.max_tokens!==undefined?{max_tokens:args.max_tokens}:{}),
      ...(args.schema_version?{schema_version:args.schema_version}:{}),...(args.surface?{surface:args.surface}:{}),...(args.phase?{phase:args.phase}:{}),...(args.host?{host:args.host}:{}),
      ...(args.workspace_root?{workspace_root:args.workspace_root}:{}),...(args.active_paths?{active_paths:args.active_paths}:{}),
    };const result=await requestEngine<ContextResult>(ipcPath,{bridgeId,credential,method:"context",params});return {content:[{type:"text" as const,text:result.text}],structuredContent:result.brief};}catch(error){return {isError:true,content:[{type:"text" as const,text:error instanceof Error?error.message:"Context request failed"}]};}
  });
  server.registerTool("get_context_status",{title:"Get Othie context status",description:"Read operational indexing and revision status without document contents.",inputSchema:z.object({})},async()=>{
    try{const result=await requestEngine<Record<string,unknown>>(ipcPath,{bridgeId,credential,method:"status"});return {content:[{type:"text" as const,text:JSON.stringify(result)}]};}catch(error){return {isError:true,content:[{type:"text" as const,text:error instanceof Error?error.message:"Status request failed"}]};}
  });
  const transport=new StdioServerTransport();await server.connect(transport);
  const shutdown=async()=>{await server.close();};process.once("SIGINT",()=>void shutdown());process.once("SIGTERM",()=>void shutdown());return server;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)startBridge().catch((error)=>{process.stderr.write(`Othie bridge failed: ${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
