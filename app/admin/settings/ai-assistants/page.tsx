import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AssistantImageManager } from "@/components/admin/assistant-image-manager";
export const runtime = "edge";
export default async function AiAssistantSettings() {
  await requireRole(["editor","admin","owner"]);
  const db = await createSupabaseServerClient();
  const { data } = await db.from("ai_assistant_images").select("role,image_url");
  const initial: Partial<Record<"ayong"|"amei",string>> = {};
  for (const row of data || []) if (row.role==="ayong" || row.role==="amei") initial[row.role]=row.image_url;
  return <main className="section"><div className="container"><div className="actions" style={{justifyContent:"space-between"}}>
    <h1>AI 助手形象管理</h1><Link className="button ghost" href="/admin">返回後台</Link></div>
    <p className="muted">圖片獨立管理；不更動對話邏輯、語音及詢問單。上傳後立即生效。</p>
    <AssistantImageManager initial={initial}/></div></main>;
}
