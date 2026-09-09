import { parseDocument, SkippedDocumentError } from "./parser.js";

process.on("message",(message:unknown)=>{void(async()=>{try{const input=message as {path:string;maxBytes:number};const sections=await parseDocument(input.path,input.maxBytes);process.send?.({ok:true,sections});}catch(error){process.send?.({ok:false,error:error instanceof Error?error.message:String(error),...(error instanceof SkippedDocumentError?{reason:error.reason}:{})});}finally{process.disconnect?.();}})();});
