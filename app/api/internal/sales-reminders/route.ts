import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getLineMessagingConfig } from "@/lib/line/config";
import { getRequestContext } from "@/lib/supabase/env";
import { formatSalesLineReminder, type SalesReminder } from "@/lib/sales-reminders";

export const runtime="edge";
export const dynamic="force-dynamic";
function cfg(name:string){
 const env=getRequestContext()?.env as Record<string,string|undefined>|undefined;
 return (env?.[name]||process.env[name]||"").trim();
}
export async function POST(request:Request){
 // Disabled unless explicitly enabled in the Preview environment.
 if(!cfg("NEXT_PUBLIC_SUPABASE_URL").includes("niorteztdbuyusemsgwa"))return NextResponse.json({ok:false,reason:"preview_only"},{status:403});
 if(cfg("SALES_LINE_REMINDERS_ENABLED")!=="true")return NextResponse.json({ok:false,reason:"disabled"},{status:503});
 const key=cfg("SALES_LINE_CRON_SECRET");
 if(!key||request.headers.get("authorization")!==`Bearer ${key}`)
   return NextResponse.json({ok:false,reason:"unauthorized"},{status:401});
 const line=getLineMessagingConfig();
 // Prevent falling back to multi-recipient inquiry notifications.
 const recipient=cfg("LINE_SALES_RECIPIENT_ID");
 if(!recipient||!line.channelAccessToken)return NextResponse.json({ok:false,reason:"missing_line_config"},{status:503});
 const activation=Date.parse(cfg("SALES_LINE_REMINDERS_START_AT"));
 if(!Number.isFinite(activation))return NextResponse.json({ok:false,reason:"missing_activation_time"},{status:503});
 const db=createSupabaseAdminClient();
 const {data,error}=await db.rpc("claim_due_sales_reminders",{p_limit:10,p_not_before:new Date(activation).toISOString()});
 if(error)return NextResponse.json({ok:false,reason:"database_unavailable"},{status:503});
 // Always link back to the Preview host that invoked this endpoint.
 const siteUrl=new URL(request.url).origin;
 let sent=0;let failed=0;
 for(const task of (data||[]) as SalesReminder[]){
  // Never send historical overdue tasks dating from before activation.
  if(Date.parse(task.due_at)<activation)continue;
  // Re-read after claim: task can have been cancelled or rescheduled.
  const {data:latest}=await db.from("sales_follow_up_tasks")
   .select("id,status,due_at,line_reminder_sent_for")
   .eq("id",task.id).maybeSingle();
  if(!latest||latest.status!=="open"||latest.due_at!==task.due_at||latest.line_reminder_sent_for===task.due_at)continue;
  let success=false;
  try{
   const res=await fetch("https://api.line.me/v2/bot/message/push",{
    method:"POST",
    headers:{"content-type":"application/json",authorization:`Bearer ${line.channelAccessToken}`},
    body:JSON.stringify({to:recipient,messages:[{type:"text",text:formatSalesLineReminder(task,siteUrl)}]})
   });
   success=res.ok;
  }catch{}
  if(success){
   await db.from("sales_follow_up_tasks").update({
    line_reminder_sent_for:task.due_at,line_reminder_last_error:null
   }).eq("id",task.id).eq("due_at",task.due_at).eq("line_reminder_claimed_for",task.due_at);
   sent++;
  }else{
   await db.from("sales_follow_up_tasks").update({line_reminder_last_error:"LINE delivery failed"})
    .eq("id",task.id).eq("line_reminder_claimed_for",task.due_at);
   failed++;
  }
 }
 return NextResponse.json({ok:true,claimed:(data||[]).length,sent,failed});
}
