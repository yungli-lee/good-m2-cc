import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AssistantImageManager } from "@/components/admin/assistant-image-manager";
export const runtime = "edge";
export default async function AiAssistantSettings() {
  await requireRole(["editor","admin","owner"]);
  const db = await createSupabaseServerClient();
  const { data } = await db.from("ai_assistant_images").select("role,image_url");
  const initial: Partial<Record<"ayong"|"amei"|"duo",string>> = {};
  for (const row of data || []) {
    const role: unknown = row.role;
    const url: unknown = row.image_url;
    if ((role === "ayong" || role === "amei" || role === "duo") && typeof url === "string") initial[role] = url;
  }
  const { data: videoData } = await db.from("ai_assistant_duo_video").select("video_url").eq("id", true).maybeSingle();
  const duoVideo = typeof videoData?.video_url === "string" ? videoData.video_url : null;
  return <main className="section"><div className="container"><div className="actions" style={{justifyContent:"space-between"}}>
    <h1>AI 助手形象管理</h1><Link className="button ghost" href="/admin">返回後台</Link></div>
    <p className="muted">圖片獨立管理；不更動對話邏輯、語音及詢問單。上傳後立即生效。</p>
    <AssistantImageManager initial={initial} initialDuoVideo={duoVideo}/></div></main>;
}
