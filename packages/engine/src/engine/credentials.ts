import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";

const credentialsSchema=z.object({version:z.literal(1),bridges:z.record(z.string(),z.object({credential_sha256:z.string().regex(/^[a-f0-9]{64}$/),profiles:z.array(z.string()).min(1),default_profile:z.string().optional(),admin:z.boolean().default(false)}))});
export type CredentialsFile=z.infer<typeof credentialsSchema>;

export function credentialHash(value:string):string{return createHash("sha256").update(value).digest("hex");}

export async function loadCredentials(path:string):Promise<CredentialsFile>{return credentialsSchema.parse(JSON.parse(await readFile(path,"utf8")) as unknown);}

export function authorizeCredential(credentials:CredentialsFile,bridgeId:string,secret:string):{profiles:string[];defaultProfile?:string;admin:boolean}|undefined{
  const bridge=credentials.bridges[bridgeId]; if(!bridge)return undefined;
  const expected=Buffer.from(bridge.credential_sha256,"hex"); const actual=Buffer.from(credentialHash(secret),"hex");
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return undefined;
  return {profiles:bridge.profiles,admin:bridge.admin,...(bridge.default_profile?{defaultProfile:bridge.default_profile}:{})};
}

export async function createCredential(path:string,bridgeId:string,profiles:string[],defaultProfile?:string,admin=false):Promise<string>{
  const token=randomBytes(32).toString("base64url"); let current:CredentialsFile={version:1,bridges:{}};
  try{current=await loadCredentials(path);}catch{}
  current.bridges[bridgeId]={credential_sha256:credentialHash(token),profiles,admin,...(defaultProfile?{default_profile:defaultProfile}:{})};
  await mkdir(dirname(path),{recursive:true,mode:0o700}); await writeFile(path,`${JSON.stringify(current,null,2)}\n`,{mode:0o600}); await chmod(path,0o600).catch(()=>{}); return token;
}
