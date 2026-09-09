import { createServer, createConnection, type Server } from "node:net";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { constants, openSync, closeSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import { platform } from "node:os";
import type { KithConfig } from "../config.js";
import type { ContextRequest } from "../types.js";
import { defaultIpcPath } from "../paths.js";
import { authorizeCredential, loadCredentials } from "./credentials.js";
import type { KithEngine } from "./service.js";

interface IpcRequest{ id:string; bridgeId:string; credential:string; method:"context"|"status"|"rebuild"|"purge"; params?:ContextRequest }
interface IpcResponse{ id:string; ok:boolean; result?:unknown; error?:string }

function chooseProfile(config:KithConfig,allowed:string[],requested:string|undefined,defaultProfile:string|undefined):string{
  const profile=requested??defaultProfile??(allowed.length===1?allowed[0]:undefined);if(!profile)throw new Error("Profile selection is ambiguous");
  if(!allowed.includes(profile)||!config.profiles[profile])throw new Error("Profile is not authorized");return profile;
}

class EngineLock{
  private fd:number|null=null;
  constructor(private readonly path:string){}
  async acquire():Promise<void>{
    await mkdir(dirname(this.path),{recursive:true,mode:0o700});
    try{this.fd=openSync(this.path,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY,0o600);}catch(error){
      let pid=0;try{pid=Number(await readFile(this.path,"utf8"));}catch{}
      if(pid){try{process.kill(pid,0);throw new Error(`Kith engine is already running (pid ${pid})`);}catch(check){if(check instanceof Error&&(check.message.startsWith("Kith engine")||(check as NodeJS.ErrnoException).code==="EPERM"))throw check;}}
      await unlink(this.path).catch(()=>{});this.fd=openSync(this.path,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY,0o600);
    }
    writeSync(this.fd,String(process.pid));
  }
  async release():Promise<void>{if(this.fd!==null){closeSync(this.fd);this.fd=null;}await unlink(this.path).catch(()=>{});}
}

export async function serveEngine(engine:KithEngine,credentialsPath:string,ipcPath?:string):Promise<{path:string;close:()=>Promise<void>}>{
  const path=ipcPath??defaultIpcPath(engine.dataDir);const lock=new EngineLock(`${path}.lock`);await lock.acquire();
  if(platform()!=="win32")await unlink(path).catch(()=>{});
  const server:Server=createServer((socket)=>{let buffer="";socket.setEncoding("utf8");socket.on("data",(chunk)=>{buffer+=chunk;if(buffer.length>1_000_000)socket.destroy(new Error("IPC request too large"));const newline=buffer.indexOf("\n");if(newline<0)return;const line=buffer.slice(0,newline);buffer="";void(async()=>{
      let response:IpcResponse={id:"unknown",ok:false,error:"Invalid request"};try{const request=JSON.parse(line) as IpcRequest;response.id=String(request.id);const credentials=await loadCredentials(credentialsPath);const grant=authorizeCredential(credentials,String(request.bridgeId),String(request.credential));if(!grant)throw new Error("Unauthorized bridge credential");
        if(request.method==="status")response={id:response.id,ok:true,result:engine.status(grant.profiles)};else if(request.method==="rebuild"||request.method==="purge"){if(!grant.admin)throw new Error("Administrative credential required");if(request.method==="rebuild")engine.ingestion.rebuild();else await engine.purge();response={id:response.id,ok:true,result:{accepted:true}};}else{if(!request.params)throw new Error("Missing context parameters");const profile=chooseProfile(engine.config,grant.profiles,request.params.profile,grant.defaultProfile);response={id:response.id,ok:true,result:await engine.context(profile,{...request.params,profile})};}
      }catch(error){response={id:response.id,ok:false,error:error instanceof Error?error.message:"IPC request failed"};}socket.end(`${JSON.stringify(response)}\n`);
    })();});});
  await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(path,()=>{server.off("error",reject);resolve();});});
  if(platform()!=="win32")await chmod(path,0o600);
  return {path,close:async()=>{await new Promise<void>((resolve)=>server.close(()=>resolve()));if(platform()!=="win32")await unlink(path).catch(()=>{});await lock.release();}};
}

export async function requestEngine<T>(path:string,request:Omit<IpcRequest,"id">,timeoutMs=10_000):Promise<T>{
  return new Promise<T>((resolve,reject)=>{const id=crypto.randomUUID();const socket=createConnection(path);let buffer="";const timer=setTimeout(()=>socket.destroy(new Error("Engine request timed out")),timeoutMs);
    socket.setEncoding("utf8");socket.on("connect",()=>socket.write(`${JSON.stringify({...request,id})}\n`));socket.on("data",(chunk)=>{buffer+=chunk;const newline=buffer.indexOf("\n");if(newline<0)return;clearTimeout(timer);socket.end();try{const response=JSON.parse(buffer.slice(0,newline)) as IpcResponse;if(response.id!==id)throw new Error("Mismatched engine response");if(!response.ok)throw new Error(response.error??"Engine request failed");resolve(response.result as T);}catch(error){reject(error);}});socket.on("error",(error)=>{clearTimeout(timer);reject(error);});});
}
