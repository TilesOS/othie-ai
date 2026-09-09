import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/client/stdio";
import { createCredential } from "../src/engine/credentials.js";
import { runEngine } from "../src/engine/lifecycle.js";
import { fixture, waitFor } from "./helpers.js";

const cleanups:string[]=[];afterEach(async()=>{for(const path of cleanups.splice(0))await rm(path,{recursive:true,force:true});});

describe("real MCP stdio bridge",()=>{
  it("serves two simultaneous hosts through one writer and survives engine restart",async()=>{
    const f=await fixture();cleanups.push(f.root);await writeFile(join(f.docs,"support.md"),"# Support\nThe response target is four hours.\n");const credentials=join(f.data,"credentials.json");const token=await createCredential(credentials,"test-host",["company"],"company");const tokenFile=join(f.data,"bridge.credential");await writeFile(tokenFile,token,{mode:0o600});let running=await runEngine(f.config);await waitFor(()=>running.engine.store.listActiveChunks("company").length>0);
    const connect=async(name:string)=>{const client=new Client({name,version:"1.0.0"});const transport=new StdioClientTransport({command:process.execPath,args:["--import","tsx","src/mcp/bridge.ts"],cwd:process.cwd(),env:{...getDefaultEnvironment(),KITH_CONFIG:f.configPath,KITH_BRIDGE_ID:"test-host",KITH_BRIDGE_CREDENTIAL_FILE:tokenFile},stderr:"pipe"});await client.connect(transport);return{client,transport};};
    const [a,b]=await Promise.all([connect("host-a"),connect("host-b")]);
    try{const [ra,rb]=await Promise.all([a.client.callTool({name:"get_organization_context",arguments:{query:"response target"}}),b.client.callTool({name:"get_organization_context",arguments:{query:"four hours"}})]);expect(JSON.stringify(ra)).toContain("four hours");expect(JSON.stringify(rb)).toContain("four hours");await running.close();running=await runEngine(f.config);await waitFor(()=>running.engine.store.listActiveChunks("company").length>0);const after=await a.client.callTool({name:"get_context_status",arguments:{}});expect(JSON.stringify(after)).toContain("corpus");const unauthorized=await a.client.callTool({name:"get_organization_context",arguments:{query:"x",profile:"other"}});expect(unauthorized.isError).toBe(true);}finally{await Promise.all([a.client.close(),b.client.close()]);await running.close();}
  },20_000);
});
