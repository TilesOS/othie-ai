import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { runHook, type ContextQuery, type HookOptions } from "../src/user-prompt-submit.js";

const options:HookOptions={cliPath:"/unused",configPath:"/unused",bridgeId:"codex",credentialFile:"/unused",maxTokens:500,deadlineMs:50};
const event=JSON.stringify({session_id:"session",transcript_path:"PRIVATE_TRANSCRIPT",cwd:"/workspace",hook_event_name:"UserPromptSubmit",model:"model",permission_mode:"default",turn_id:"turn",prompt:"PRIVATE_USER_PROMPT"});
const fixture=async(name:string)=>JSON.parse(await readFile(new URL(`./fixtures/${name}.json`,import.meta.url),"utf8")) as unknown;

describe("Codex UserPromptSubmit adapter",()=>{
  it("passes the prompt to the compiled transport over stdin rather than argv",async()=>{
    const cliPath=new URL("./fixtures/fake-cli.mjs",import.meta.url).pathname;const result=await runHook(event,{...options,cliPath,deadlineMs:500});expect(result.stderr).toBe("");expect(result.stdout).toContain("Support replies arrive within four hours");
  });

  it("emits cited developer context for a relevant result",async()=>{
    let request:ContextQuery|undefined;const result=await runHook(event,options,{query:async(value)=>{request=value;return fixture("relevant-result");}});expect(request).toEqual({query:"PRIVATE_USER_PROMPT",workspaceRoot:"/workspace",surface:"code",phase:"turn_start",host:"codex",maxTokens:500});expect(result.stderr).toBe("");const output=JSON.parse(result.stdout) as any;expect(output.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");expect(output.hookSpecificOutput.additionalContext).toContain("Support replies arrive within four hours");expect(output.hookSpecificOutput.additionalContext).toContain('source="s1/support.md"');expect(result.stdout).not.toContain("PRIVATE_TRANSCRIPT");
  });

  it("stays silent for an explicit empty result",async()=>{expect(await runHook(event,options,{query:async()=>fixture("empty-result")})).toEqual({stdout:"",stderr:""});});

  it("fails open without logging prompts or returned context for invalid data",async()=>{
    const result=await runHook(event,options,{query:async()=>fixture("invalid-result")});expect(result.stdout).toBe("");expect(result.stderr).toBe("Othie Codex hook: invalid_context_response\n");expect(result.stderr).not.toContain("PRIVATE_USER_PROMPT");expect(result.stderr).not.toContain("PRIVATE_RETURNED_CONTEXT");
  });

  it("fails open when Othie is unavailable",async()=>{const result=await runHook(event,options,{query:async()=>{throw new Error("PRIVATE_USER_PROMPT secret");}});expect(result.stdout).toBe("");expect(result.stderr).toBe("Othie Codex hook: context_unavailable\n");expect(result.stderr).not.toContain("PRIVATE_USER_PROMPT");});

  it("aborts at the deadline and emits no context",async()=>{
    const started=performance.now();const query=vi.fn(async(_request:ContextQuery,_signal:AbortSignal)=>new Promise<never>(()=>{}));const result=await runHook(event,{...options,deadlineMs:20},{query});expect(performance.now()-started).toBeLessThan(500);expect(result).toEqual({stdout:"",stderr:"Othie Codex hook: context_timeout\n"});
  });

  it("rejects malformed or unrelated hook events without echoing input",async()=>{const result=await runHook('{"hook_event_name":"Stop","prompt":"PRIVATE_USER_PROMPT","cwd":"/workspace"}',options);expect(result).toEqual({stdout:"",stderr:"Othie Codex hook: invalid_event\n"});});
});
