import { fork } from "node:child_process";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ParsedSection } from "../types.js";
import { parseDocument, SkippedDocumentError } from "./parser.js";

export async function parseDocumentIsolated(path:string,maxBytes:number,snapshot?:Buffer):Promise<ParsedSection[]>{
  if(![".pdf",".docx"].includes(extname(path).toLowerCase()))return parseDocument(path,maxBytes,snapshot);
  const runningTs=import.meta.url.endsWith(".ts");const worker=fileURLToPath(new URL(runningTs?"./parser-process.ts":"./parser-process.js",import.meta.url));
  return new Promise<ParsedSection[]>((resolve,reject)=>{let settled=false;const child=fork(worker,[],{stdio:["ignore","ignore","ignore","ipc"],serialization:"advanced",execArgv:runningTs?["--max-old-space-size=256","--import","tsx"]:["--max-old-space-size=256"]});const finish=(callback:()=>void)=>{if(settled)return;settled=true;clearTimeout(timer);callback();};const timer=setTimeout(()=>{child.kill();finish(()=>reject(new Error("Parser process timed out")));},30_000);child.once("message",(message:unknown)=>{const result=message as {ok:boolean;sections?:ParsedSection[];error?:string;reason?:"encrypted"|"oversized"|"unsupported"|"scanned"|"malformed"};finish(()=>{if(result.ok&&result.sections)resolve(result.sections);else if(result.reason)reject(new SkippedDocumentError(result.reason,result.error??"Parser process skipped document"));else reject(new Error(result.error??"Parser process failed"));});});child.once("error",(error)=>finish(()=>reject(error)));child.once("exit",(code)=>{if(code!==0)finish(()=>reject(new Error(`Parser process exited with code ${code}`)));});child.send({path,maxBytes,snapshot});});
}
