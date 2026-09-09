import { join } from "node:path";
import type { KithConfig } from "../config.js";
import { defaultDataDir, defaultIpcPath } from "../paths.js";
import { serveEngine } from "./ipc.js";
import { KithEngine } from "./service.js";

export async function runEngine(config:KithConfig):Promise<{engine:KithEngine;ipcPath:string;close:()=>Promise<void>}>{
  const dataDir=config.data_dir??defaultDataDir();const engine=new KithEngine(config,dataDir);await engine.start();
  const credentials=config.credentials_file??join(dataDir,"credentials.json");const server=await serveEngine(engine,credentials,config.ipc_path??defaultIpcPath(dataDir));
  let closed=false;return {engine,ipcPath:server.path,close:async()=>{if(closed)return;closed=true;await server.close();await engine.stop();}};
}
