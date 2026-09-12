#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export interface ContextQuery {
  query: string;
  workspaceRoot: string;
  surface: "code";
  phase: "turn_start";
  host: "codex";
  maxTokens: number;
}

export interface HookOptions {
  cliPath: string;
  configPath: string;
  bridgeId: string;
  credentialFile: string;
  maxTokens: number;
  deadlineMs: number;
}

interface HookDependencies {
  query: (request: ContextQuery, signal: AbortSignal) => Promise<unknown>;
}

interface HookRunResult { stdout: string; stderr: string }

const MAX_ENGINE_OUTPUT_CHARS = 1_000_000;
const diagnostic = (code: "invalid_event"|"invalid_context_response"|"context_unavailable"|"context_timeout") => `Othie Codex hook: ${code}\n`;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isCitation = (value: unknown): boolean => isRecord(value) && typeof value.source === "string" && typeof value.at === "string" && (value.quote === undefined || typeof value.quote === "string");

function validContextResult(value: unknown): value is { text:string; brief:Record<string,unknown> } {
  if(!isRecord(value)||typeof value.text!=="string"||!isRecord(value.brief))return false;
  const brief=value.brief;if(brief.schema_version!=="1"||brief.context_text!==value.text||!isRecord(brief.request)||brief.request.surface!=="code"||brief.request.phase!=="turn_start"||brief.request.host!=="codex"||!isRecord(brief.status))return false;
  const status=brief.status;const modes=new Set(["deterministic","synthesized","fallback","empty"]);if(typeof status.mode!=="string"||!modes.has(status.mode))return false;
  const integerFields=["tokenCount","omittedItems","conflicts","corpusRevision","ruleRevision"];if(!integerFields.every((field)=>Number.isSafeInteger(status[field])&&Number(status[field])>=0))return false;
  const booleanFields=["tokenizerEstimate","keywordAvailable","vectorAvailable","synthesisAttempted"];if(typeof status.profile!=="string"||typeof status.tokenizer!=="string"||!booleanFields.every((field)=>typeof status[field]==="boolean"))return false;
  if(!Array.isArray(brief.applicable_rules)||!brief.applicable_rules.every((item)=>isRecord(item)&&typeof item.id==="string"&&typeof item.text==="string"&&isCitation(item.citation)))return false;
  if(!Array.isArray(brief.permitted_excerpts)||!brief.permitted_excerpts.every((item)=>isRecord(item)&&typeof item.id==="string"&&typeof item.text==="string"&&isCitation(item.citation)))return false;
  if(brief.synthesis!==undefined&&(!isRecord(brief.synthesis)||typeof brief.synthesis.text!=="string"||!Array.isArray(brief.synthesis.citations)||!brief.synthesis.citations.every(isCitation)))return false;
  return [brief.external_facts,brief.navigation_hints,brief.verification_checks,brief.conflicts].every(Array.isArray);
}

function useful(value: { brief:Record<string,unknown> }): boolean {
  const brief=value.brief;
  return (brief.status as Record<string,unknown>).mode!=="empty"&&((brief.applicable_rules as unknown[]).length>0||(brief.permitted_excerpts as unknown[]).length>0||brief.synthesis!==undefined);
}

function parseEvent(raw: string): {prompt:string;cwd:string}|undefined {
  try{const value=JSON.parse(raw) as unknown;if(!isRecord(value)||value.hook_event_name!=="UserPromptSubmit"||typeof value.prompt!=="string"||!value.prompt.trim()||typeof value.cwd!=="string"||!value.cwd.trim())return undefined;return{prompt:value.prompt,cwd:value.cwd};}catch{return undefined;}
}

export async function runHook(rawInput: string, options: HookOptions, dependencies?: HookDependencies): Promise<HookRunResult> {
  const event=parseEvent(rawInput);if(!event)return{stdout:"",stderr:diagnostic("invalid_event")};
  const controller=new AbortController();let rejectDeadline!:(reason:Error)=>void;const deadline=new Promise<never>((_resolve,reject)=>{rejectDeadline=reject;});const timer=setTimeout(()=>{controller.abort();rejectDeadline(new Error("deadline"));},options.deadlineMs);
  try{
    const query:ContextQuery={query:event.prompt,workspaceRoot:event.cwd,surface:"code",phase:"turn_start",host:"codex",maxTokens:options.maxTokens};
    const operation=(dependencies?.query??((request,signal)=>queryThroughCli(request,options,signal)))(query,controller.signal);const result=await Promise.race([operation,deadline]);
    if(!validContextResult(result))return{stdout:"",stderr:diagnostic("invalid_context_response")};
    if(!useful(result))return{stdout:"",stderr:""};
    const additionalContext=`Othie context brief (source-backed; preserve the included citations):\n${result.brief.context_text as string}`;
    return{stdout:`${JSON.stringify({hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext}})}\n`,stderr:""};
  }catch{return{stdout:"",stderr:diagnostic(controller.signal.aborted?"context_timeout":"context_unavailable")};}
  finally{clearTimeout(timer);}
}

export async function queryThroughCli(request: ContextQuery, options: HookOptions, signal: AbortSignal): Promise<unknown> {
  return new Promise((resolvePromise,reject)=>{
    const args=[options.cliPath,"query","--config",options.configPath,"--bridge",options.bridgeId,"--credential-file",options.credentialFile,"--query-stdin","--max-tokens",String(request.maxTokens),"--surface",request.surface,"--phase",request.phase,"--host",request.host,"--workspace-root",request.workspaceRoot,"--json"];
    const child=spawn(process.execPath,args,{stdio:["pipe","pipe","ignore"],shell:false});let stdout="",settled=false;
    const finish=(callback:()=>void)=>{if(settled)return;settled=true;signal.removeEventListener("abort",onAbort);callback();};
    const onAbort=()=>{child.kill("SIGKILL");finish(()=>reject(new Error("deadline")));};
    if(signal.aborted){onAbort();return;}signal.addEventListener("abort",onAbort,{once:true});
    child.on("error",()=>finish(()=>reject(new Error("unavailable"))));
    child.stdin.on("error",()=>{});
    child.stdout.setEncoding("utf8");child.stdout.on("data",(chunk:string)=>{stdout+=chunk;if(stdout.length>MAX_ENGINE_OUTPUT_CHARS){child.kill("SIGKILL");finish(()=>reject(new Error("oversized")));}});
    child.on("close",(code)=>finish(()=>{if(code!==0){reject(new Error("failed"));return;}try{resolvePromise(JSON.parse(stdout) as unknown);}catch{reject(new Error("invalid"));}}));
    child.stdin.end(request.query);
  });
}

function arg(name:string):string|undefined{const index=process.argv.indexOf(`--${name}`);return index>=0?process.argv[index+1]:undefined;}
function positiveInteger(value:string|undefined,fallback:number):number{const parsed=Number(value??fallback);return Number.isSafeInteger(parsed)&&parsed>0?parsed:fallback;}
export function optionsFromProcess():HookOptions{
  const sourceDefault=new URL(import.meta.url.includes("/dist/")?"../../../../packages/engine/dist/src/cli.js":"../../../packages/engine/dist/src/cli.js",import.meta.url);
  return{cliPath:resolve(arg("cli")??fileURLToPath(sourceDefault)),configPath:resolve(arg("config")??process.env.OTHIE_CONFIG??"config.json"),bridgeId:arg("bridge")??process.env.OTHIE_BRIDGE_ID??"codex",credentialFile:resolve(arg("credential-file")??process.env.OTHIE_BRIDGE_CREDENTIAL_FILE??".othie/bridge-codex.credential"),maxTokens:positiveInteger(arg("max-tokens")??process.env.OTHIE_CODEX_MAX_TOKENS,500),deadlineMs:positiveInteger(arg("deadline-ms")??process.env.OTHIE_CODEX_DEADLINE_MS,2000)};
}

async function readHookStdin():Promise<string>{let raw="";process.stdin.setEncoding("utf8");for await(const chunk of process.stdin){raw+=chunk;if(raw.length>1_000_000)throw new Error("oversized hook event");}return raw;}
async function main():Promise<void>{const result=await runHook(await readHookStdin(),optionsFromProcess());if(result.stdout)process.stdout.write(result.stdout);if(result.stderr)process.stderr.write(result.stderr);}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void main().catch(()=>{process.stderr.write(diagnostic("context_unavailable"));});
