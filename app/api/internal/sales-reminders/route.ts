import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLineMessagingConfig } from "@/lib/line/config";
import { getRequestContext } from "@/lib/supabase/env";
import { formatSalesLineReminder, type SalesReminder } from "@/lib/sales-reminders";
import { resolveSalesLineEnvironment, parseSalesReminderActivation, salesReminderRetryKey } from "@/lib/sales-line-environment";

export const runtime="edge";
export const dynamic="force-dynamic";
function cfg(name:string){
 const env=getRequestContext()?.env as Record<string,string|undefined>|undefined;
 return (env?.[name]||process.env[name]||"").trim();
}
export async function POST(request:Request){
 const scope=resolveSalesLineEnvironment(request.url,cfg);
 if(!scope)return NextResponse.json({ok:false,reason:"environment_mismatch"},{status:403});
 if(cfg("SALES_LINE_REMINDERS_ENABLED")!=="true")return NextResponse.json({ok:false,reason:"disabled"},{status:503});
 const key=cfg("SALES_LINE_CRON_SECRET");
 if(!key||request.headers.get("authorization")!==`Bearer ${key}`)
   return NextResponse.json({ok:false,reason:"unauthorized"},{status:401});
 const line=getLineMessagingConfig();
 // Prevent falling back to multi-recipient inquiry notifications.
 if(!line.channelAccessToken)return NextResponse.json({ok:false,reason:"missing_line_config"},{status:503});
 const activation=parseSalesReminderActivation(cfg("SALES_LINE_REMINDERS_START_AT"));
 if(activation===null)return NextResponse.json({ok:false,reason:"missing_activation_time"},{status:503});
 if(activation>Date.now())return NextResponse.json({ok:true,reason:"not_started",claimed:0,sent:0,failed:0});
 const dbUrl=scope.databaseUrl;
 const dbKey=cfg("SUPABASE_SERVICE_ROLE_KEY");
 if(!dbKey)return NextResponse.json({ok:false,reason:"missing_database_config"},{status:503});
 const db=createClient(dbUrl,dbKey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{apikey:dbKey,Authorization:`Bearer ${dbKey}`}}});
 const {data,error}=await db.rpc("claim_due_sales_reminders",{p_limit:10,p_not_before:new Date(activation).toISOString()});
 if(error)return NextResponse.json({ok:false,reason:"database_unavailable",db_code:error.code||"unknown"},{status:503});
 const siteUrl=scope.siteUrl;
 let sent=0;let failed=0;
 for(const task of (data||[]) as SalesReminder[]){
  // Never send historical overdue tasks dating from before activation.
  if(Date.parse(task.due_at)<activation)continue;
  // Re-read after claim: task can have been cancelled or rescheduled.
  const {data:latest}=await db.from("sales_follow_up_tasks")
   .select("id,status,due_at,line_reminder_sent_for")
   .eq("id",task.id).maybeSingle();
  if(!latest||latest.status!=="open"||latest.due_at!==task.due_at||latest.line_reminder_sent_for===task.due_at)continue;
  const {data:taskOwner}=await db.from("sales_follow_up_tasks").select("assigned_to").eq("id",task.id).maybeSingle();
  const {data:destination}=taskOwner?.assigned_to ? await db.from("sales_line_recipients").select("line_user_id").eq("user_id",taskOwner.assigned_to).maybeSingle() : {data:null};
  // Preserve the legacy recipient only for a task actually assigned to an Owner.
  // Never forward an unconfigured Editor/Admin task to the owner.
  const {data:assignee}=taskOwner?.assigned_to ? await db.from("profiles").select("role").eq("id",taskOwner.assigned_to).is("deleted_at",null).maybeSingle() : {data:null};
  if(!assignee||!["owner","admin","editor"].includes(assignee.role)){failed++;continue;}
  const recipient=destination?.line_user_id || (assignee?.role==="owner" ? cfg("LINE_SALES_RECIPIENT_ID") : "");
  if(!recipient){
   await db.from("sales_follow_up_tasks").update({line_reminder_last_error:"Recipient LINE ID is not configured"}).eq("id",task.id).eq("line_reminder_claimed_for",task.due_at);
   failed++;continue;
  }
  let success=false;
  try{
   const res=await fetch("https://api.line.me/v2/bot/message/push",{
    method:"POST",
    headers:{"content-type":"application/json",authorization:`Bearer ${line.channelAccessToken}`,
     "X-Line-Retry-Key":await salesReminderRetryKey(scope.environment,task.id,task.due_at)},
    signal:AbortSignal.timeout(15000),
    body:JSON.stringify({to:recipient,messages:[{type:"text",text:formatSalesLineReminder(task,siteUrl)}]})
   });
   success=res.ok||(res.status===409&&Boolean(res.headers.get("x-line-accepted-request-id")));
  }catch{}
  if(success){
   const {error:saveError}=await db.from("sales_follow_up_tasks").update({
    line_reminder_sent_for:task.due_at,line_reminder_last_error:null
   }).eq("id",task.id).eq("due_at",task.due_at).eq("line_reminder_claimed_for",task.due_at);
   if(saveError)failed++;else sent++;
  }else{
   await db.from("sales_follow_up_tasks").update({line_reminder_last_error:"LINE delivery failed"})
    .eq("id",task.id).eq("line_reminder_claimed_for",task.due_at);
   failed++;
  }
 }
 return NextResponse.json({ok:true,claimed:(data||[]).length,sent,failed});
}
