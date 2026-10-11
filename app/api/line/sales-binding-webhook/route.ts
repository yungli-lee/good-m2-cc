import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {getRequestContext} from "@/lib/supabase/env";
export const runtime="edge";
export const dynamic="force-dynamic";
function config(name:string){
 const env=getRequestContext()?.env as Record<string,string|undefined>|undefined;
 return (env?.[name]||process.env[name]||"").trim();
}
function hex(b:Uint8Array){return Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");}
async function sha256(s:string){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))));}
export async function POST(request:Request){
 if(!config("NEXT_PUBLIC_SUPABASE_URL").includes("niorteztdbuyusemsgwa"))return NextResponse.json({error:"preview_only"},{status:403});
 const secret=config("LINE_MESSAGING_CHANNEL_SECRET");
 if(!secret)return NextResponse.json({error:"not_configured"},{status:503});
 const raw=await request.text();
 if(raw.length>65536)return NextResponse.json({error:"too_large"},{status:413});
 const signature=request.headers.get("x-line-signature")||"";
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw)));
 const b64=btoa(String.fromCharCode(...sig));
 if(signature.length!==b64.length || !([...b64].every((c,i)=>c===signature[i])))return NextResponse.json({error:"invalid_signature"},{status:401});
 let body:{events?:Array<{type?:string;message?:{type?:string;text?:string};source?:{type?:string;userId?:string}}>}={};
 try{body=JSON.parse(raw);}catch{return NextResponse.json({error:"invalid_body"},{status:400});}
 const dbUrl=config("NEXT_PUBLIC_SUPABASE_URL"),dbKey=config("SUPABASE_SERVICE_ROLE_KEY");
 if(!dbUrl.includes("niorteztdbuyusemsgwa")||!dbKey)return NextResponse.json({error:"database_config"},{status:503});
 const db=createClient(dbUrl,dbKey,{auth:{persistSession:false,autoRefreshToken:false}});
 let bound=0;
 for(const event of (body.events||[]).slice(0,20)){
  const id=event.source?.userId,text=event.message?.text?.trim();
  if(event.type!=="message"||event.message?.type!=="text"||!id||!text)continue;
  const match=/^綁定\s+([A-Z2-9]{8})$/.exec(text);
  if(!match)continue;
  const {data,error}=await db.rpc("consume_sales_line_binding",{p_token_hash:await sha256(match[1]),p_line_user_id:id});
  if(!error&&data)bound++;
 }
 return NextResponse.json({ok:true,bound});
}
