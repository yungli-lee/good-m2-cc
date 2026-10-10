import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { redactContact } from "@/lib/concierge/schema";
import { getSupabaseEnv } from "@/lib/supabase/env";
export const runtime = "edge";
const noStore = { "Cache-Control": "no-store" };
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("consent"), accepted: z.literal(true), sourcePath: z.string().max(220).default("/guide") }),
  z.object({ action: z.literal("append"), sessionId: z.string().uuid(), proof: z.string().length(64), userText: z.string().trim().min(1).max(500), assistantText: z.string().trim().min(1).max(1200), propertySlug: z.string().max(200).optional(), needs: z.record(z.string(), z.unknown()).optional() }),
  z.object({ action: z.literal("revoke"), sessionId: z.string().uuid(), proof: z.string().length(64) })
]);
function failure(status: number, code = "archive_unavailable") { const labels: Record<string,string> = { archive_unavailable:"對話保存暫時不可用", archive_config:"Preview 尚未設定對話保存所需的資料庫金鑰", archive_database:"對話資料庫寫入失敗，請聯絡網站管理員", archive_authorization:"此對話保存授權已失效，請重新同意", archive_input:"保存資料格式不正確，請重新操作", archive_target:"Preview 資料庫設定異常，已阻止誤寫入正式資料庫", archive_key:"Preview Supabase 伺服器金鑰或權限不正確", archive_schema:"Preview 資料表尚未被 API 辨識" }; return NextResponse.json({ error: labels[code] || labels.archive_unavailable, code }, { status, headers: noStore }); }
async function hash(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2,"0")).join("");
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return failure(403);
  if (Number(request.headers.get("content-length") || "0") > 5000) return failure(413);
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await request.json()); } catch { return failure(422,"archive_input"); }
  try {
    const configuredUrl = getSupabaseEnv().url || "";
    const expectedPreviewProject = "niorteztdbuyusemsgwa";
    if (!configuredUrl.startsWith(`https://${expectedPreviewProject}.supabase.co`)) {
      console.error("concierge_archive_wrong_database_target");
      return failure(503,"archive_target");
    }
    let db: ReturnType<typeof createSupabaseAdminClient>;
    try { db = createSupabaseAdminClient(); } catch { console.error("concierge_archive_config_missing"); return failure(503,"archive_config"); }
    if (body.action === "consent") {
      const proof = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
      const { data, error } = await db.from("concierge_consented_sessions").insert({
        proof_hash: await hash(proof), consent_version: "2026-10-10-v1",
        source_path: body.sourcePath.startsWith("/") && !body.sourcePath.startsWith("//") ? body.sourcePath : "/guide"
      }).select("id").single();
      if (error || !data) { console.error("concierge_archive_consent_insert_failed", error?.code || "empty"); return failure(503,error?.code === "PGRST205" || error?.code === "42P01" ? "archive_schema" : error?.code === "42501" || error?.code === "PGRST301" || error?.code === "401" ? "archive_key" : "archive_database"); }
      return NextResponse.json({ sessionId: data.id, proof }, { headers: noStore });
    }
    const { data: session, error } = await db.from("concierge_consented_sessions").select("id,proof_hash,expires_at").eq("id",body.sessionId).maybeSingle();
    if (error || !session || session.proof_hash !== await hash(body.proof) || Date.parse(session.expires_at) <= Date.now()) return failure(403,"archive_authorization");
    if (body.action === "revoke") {
      const { error: deleteError } = await db.from("concierge_consented_sessions").delete().eq("id",body.sessionId);
      return deleteError ? failure(503,"archive_database") : NextResponse.json({ ok: true }, { headers: noStore });
    }
    const preference = /不喜歡|不要這間|太舊|太貴|不考慮/.test(body.userText) ? "not_interested" : /喜歡|有興趣|想了解|還想看/.test(body.userText) ? "interested" : "unspecified";
    const needs = body.needs || {};
    const { error: insertError } = await db.from("concierge_consented_messages").insert([
      { session_id: session.id, role: "user", message: redactContact(body.userText), property_slug: body.propertySlug || null, preference, needs },
      { session_id: session.id, role: "assistant", message: redactContact(body.assistantText), property_slug: body.propertySlug || null, preference: "unspecified", needs }
    ]);
    return insertError ? failure(503,"archive_database") : NextResponse.json({ ok: true }, { headers: noStore });
  } catch { return failure(503); }
}
