#!/usr/bin/env node
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { configSchema, loadConfig } from "./config.js";
import { createCredential } from "./engine/credentials.js";
import { requestEngine } from "./engine/ipc.js";
import { runEngine } from "./engine/lifecycle.js";
import { defaultDataDir, defaultIpcPath } from "./paths.js";
import { hostConfiguration, type HostName } from "./mcp/host-config.js";
import type { ContextResult } from "./types.js";

function flag(name:string):string|undefined{const index=process.argv.indexOf(`--${name}`);return index>=0?process.argv[index+1]:undefined;}
function has(name:string):boolean{return process.argv.includes(`--${name}`);}
async function configAndPaths(){const configPath=resolve(flag("config")??"config.json");const config=await loadConfig(configPath);const dataDir=config.data_dir??defaultDataDir();return {config,configPath,dataDir,ipcPath:config.ipc_path??defaultIpcPath(dataDir),credentialsPath:config.credentials_file??join(dataDir,"credentials.json")};}
async function clientIdentity(){const bridgeId=flag("bridge");const credentialFile=flag("credential-file");if(!bridgeId||!credentialFile)throw new Error("--bridge and --credential-file are required");return {bridgeId,credential:(await readFile(resolve(credentialFile),"utf8")).trim()};}

export async function main():Promise<void>{
  const [command,subcommand]=process.argv.slice(2).filter((arg,index,array)=>!arg.startsWith("--")&&(index===0||!array[index-1]!.startsWith("--")));
  if (command === "init") {
    const target = resolve(flag("config") ?? "config.json");
    const source = new URL(import.meta.url.includes("/dist/") ? "../../config.example.json" : "../config.example.json", import.meta.url);
    const config = configSchema.parse(JSON.parse(await readFile(source, "utf8")));
    for (const profile of Object.values(config.profiles)) {
      for (const entry of profile.sources) {
        entry.root = resolve(dirname(fileURLToPath(source)), entry.root);
      }
    }
    await writeFile(target, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
    process.stdout.write(`Created ${target}\n`);
    return;
  }
  if(command==="host-config"){
    const host=flag("host"),bridgeId=flag("bridge"),credentialFile=flag("credential-file");
    if(!host||!["claude","cursor","vscode"].includes(host)||!bridgeId||!credentialFile)throw new Error("host-config requires --host claude|cursor|vscode --bridge NAME --credential-file FILE");
    const bridgePath=fileURLToPath(new URL(import.meta.url.includes("/dist/")?"./mcp/bridge.js":"../dist/src/mcp/bridge.js",import.meta.url));
    process.stdout.write(`${JSON.stringify(hostConfiguration(host as HostName,{configPath:resolve(flag("config")??"config.json"),bridgeId,credentialFile,bridgePath}),null,2)}\n`);return;
  }
  const paths=await configAndPaths();
  if(command==="engine"&&subcommand==="foreground"){
    const running=await runEngine(paths.config);process.stderr.write(`Othie engine listening at ${running.ipcPath}\n`);await new Promise<void>((resolveDone)=>{let stopping=false;const stop=()=>{if(stopping)return;stopping=true;void running.close().then(resolveDone);};process.once("SIGINT",stop);process.once("SIGTERM",stop);});return;
  }
  if(command==="credential"&&subcommand==="create"){
    const bridgeId=flag("bridge");const profiles=(flag("profiles")??"").split(",").filter(Boolean);if(!bridgeId||!profiles.length)throw new Error("--bridge and comma-separated --profiles are required");for(const profile of profiles)if(!paths.config.profiles[profile])throw new Error(`Unknown profile ${profile}`);
    const defaultProfile=flag("default-profile");if(defaultProfile&&!profiles.includes(defaultProfile))throw new Error("Default profile must be authorized");const token=await createCredential(paths.credentialsPath,bridgeId,profiles,defaultProfile,has("admin"));
    const output=resolve(flag("out")??join(paths.dataDir,`bridge-${bridgeId}.credential`));await mkdir(resolve(output,".."),{recursive:true,mode:0o700});await writeFile(output,`${token}\n`,{mode:0o600});await chmod(output,0o600).catch(()=>{});process.stdout.write(`Credential written to ${output}\n`);return;
  }
  const identity=await clientIdentity();
  if(command==="status"){const result=await requestEngine<Record<string,unknown>>(paths.ipcPath,{...identity,method:"status"});process.stdout.write(`${JSON.stringify(result,null,2)}\n`);return;}
  if(command==="query"){const query=flag("query");if(!query)throw new Error("--query is required");const profile=flag("profile");const maxTokens=flag("max-tokens");const params={query,...(profile?{profile}:{}),...(maxTokens?{max_tokens:Number(maxTokens)}:{}),synthesize:has("synthesize")};const result=await requestEngine<ContextResult>(paths.ipcPath,{...identity,method:"context",params});process.stdout.write(`${result.text}\n`);return;}
  if(command==="rebuild"||command==="purge"){await requestEngine(paths.ipcPath,{...identity,method:command});process.stdout.write(`${command} accepted\n`);return;}
  throw new Error("Usage: othie init | engine foreground | credential create | host-config | status | query | rebuild | purge");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch((error)=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
