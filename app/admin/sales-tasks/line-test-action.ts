"use server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getRequestContext } from "@/lib/supabase/env";
import { getLineMessagingConfig } from "@/lib/line/config";

function env(name:string) {
 const cf=getRequestContext()?.env as Record<string,string|undefined>|undefined;
 return (cf?.[name]||process.env[name]||"").trim();
}
export async function sendPreviewSalesLineTest() {
 await requireRole(["owner"]);
 // Fail closed: NEVER allow the test message from the production database.
 if(!env("NEXT_PUBLIC_SUPABASE_URL").includes("niorteztdbuyusemsgwa"))
  redirect("/admin/sales-tasks?line_test=preview_only");
 const recipient=env("LINE_SALES_RECIPIENT_ID");
 const {channelAccessToken}=getLineMessagingConfig();
 if(!recipient||!channelAccessToken)
  redirect("/admin/sales-tasks?line_test=missing_config");
 if(!/^U[0-9a-f]{32}$/i.test(recipient)) {
  const hint=recipient.startsWith("U")?"u_prefix":"other_prefix";
  const length=recipient.length;
  redirect(`/admin/sales-tasks?line_test=invalid_recipient&line_length=${length}&line_hint=${hint}`);
 }
 try {
  const res=await fetch("https://api.line.me/v2/bot/message/push",{
   method:"POST",
   headers:{"content-type":"application/json",authorization:`Bearer ${channelAccessToken}`},
   body:JSON.stringify({to:recipient,messages:[{type:"text",text:"🔔 勇美銷售工作台｜Preview 測試通知\n這是一則手動測試訊息，不代表已有任何到期任務或帶看預約。"}]})
  });
  redirect(res.ok?"/admin/sales-tasks?line_test=accepted":"/admin/sales-tasks?line_test=failed");
 } catch(e) {
  // Next.js redirects throw special errors; ensure successful result isn't swallowed.
  if(e && typeof e==="object"&&"digest" in e)throw e;
  redirect("/admin/sales-tasks?line_test=failed");
 }
}
