import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { relationInputSchema } from "@/lib/people-properties";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

const writeRoles = ["editor", "admin", "owner"];
function fail(status: number, code: string, message: string) { return NextResponse.json({ ok: false, code, message }, { status }); }
function dbError(error: { code?: string } | null): Response | null {
  if (!error) return null;
  if (error.code === "23505") return fail(409, "RELATION_DUPLICATE", "此客戶與物件已存在相同的有效關係。");
  if (error.code === "23503") return fail(404, "RELATION_TARGET_NOT_FOUND", "找不到指定的客戶或物件。");
  if (error.code === "42501") return fail(403, "RELATION_FORBIDDEN", "你沒有修改關聯的權限。");
  if (error.code === "42P01" || error.code === "PGRST205") return fail(503, "RELATION_SCHEMA_MISSING", "Preview 尚未完成關聯資料表設定。");
  return fail(500, "RELATION_UPDATE_FAILED", "關聯更新失敗，請稍後再試。");
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentProfile();
  if (!current) return fail(401, "UNAUTHENTICATED", "請先登入。");
  if (!writeRoles.includes(current.profile.role)) return fail(403, "RELATION_FORBIDDEN", "你沒有修改關聯的權限。");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(400, "INVALID_RELATION_ID", "關聯識別碼格式有誤。");
  let body: unknown;
  try { body = await request.json(); } catch { return fail(400, "INVALID_JSON", "請提供有效的 JSON 資料。"); }
  const parsed = relationInputSchema.safeParse(body);
  if (!parsed.success) return fail(400, "RELATION_VALIDATION", parsed.error.issues[0]?.message || "關聯欄位格式有誤。");
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: lookupError } = await supabase.from("people_properties").select("id").eq("id", id).maybeSingle();
  if (lookupError) return dbError(lookupError) || fail(500, "RELATION_LOOKUP_FAILED", "關聯查詢失敗，請稍後再試。");
  if (!existing) return fail(404, "RELATION_NOT_FOUND", "找不到指定的關聯。");
  const { error } = await supabase.from("people_properties").update({ relationship_type: parsed.data.relationship_type, relationship_label: parsed.data.relationship_label || null, note: parsed.data.note || null, started_at: parsed.data.started_at || null, ended_at: parsed.data.ended_at || null }).eq("id", id).eq("person_id", parsed.data.person_id).eq("property_id", parsed.data.property_id);
  const mapped = dbError(error);
  if (mapped) return mapped;
  return NextResponse.json({ ok: true, message: "關聯已更新" });
}
