import {spawn, execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,rm,realpath} from 'node:fs/promises';
import {join} from 'node:path';
const root=await realpath(await mkdtemp('/private/tmp/othie-config-probe-'));
try {
 const cwd=join(root,'workspace with spaces'), configHome=join(root,'codex-home');
 await mkdir(join(cwd,'.codex'),{recursive:true});await mkdir(configHome);
 execFileSync('git',['init','--quiet'],{cwd});
 await writeFile(join(cwd,'.codex','config.toml'),'model_reasoning_effort = "low"\n');
 for (const mode of ['override','persisted']) {
  await writeFile(join(configHome,'config.toml'),mode==='persisted'?`[projects.${JSON.stringify(cwd)}]\ntrust_level = "trusted"\n`:'');
  const child=spawn('codex',['app-server',...(mode==='override'?['-c',`projects.${JSON.stringify(cwd)}.trust_level="trusted"`]:[])],{cwd,env:{...process.env,CODEX_HOME:configHome},stdio:'pipe'});
  const timer=setTimeout(()=>child.kill('SIGKILL'),15000);let buffer='';let diagnostic='';
  child.stderr.on('data',x=>diagnostic+=x);
  await new Promise(resolve=>{
   child.stdout.on('data',chunk=>{buffer+=chunk;let n;while((n=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);try{const event=JSON.parse(line);if(event.id===1){child.stdin.write(JSON.stringify({method:'initialized'})+'\n');child.stdin.write(JSON.stringify({id:2,method:'config/read',params:{cwd,includeLayers:true}})+'\n');} if(event.id===2){console.log(JSON.stringify({mode,error:event.error,layers:event.result?.layers?.map(x=>({name:x.name,disabledReason:x.disabledReason,keys:Object.keys(x.config)}))}));child.kill('SIGTERM');}}catch{}}});
   child.once('close',()=>{clearTimeout(timer);resolve();});
   child.stdin.write(JSON.stringify({id:1,method:'initialize',params:{clientInfo:{name:'othie_synthetic_probe',version:'1.0.0'},capabilities:{experimentalApi:true}}})+'\n');
  });
  if(diagnostic.includes('error')) console.log('Host diagnostics reported errors');
 }
}finally{await rm(root,{recursive:true,force:true});}
