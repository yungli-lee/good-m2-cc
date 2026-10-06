import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { relationInputSchema } from "@/lib/people-properties";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

const writeRoles = ["editor", "admin", "owner"];
function errorResponse(status: number, code: string, message: string) { return NextResponse.json({ ok: false, code, message }, { status }); }
function mapDbError(error: { code?: string } | null) {
  if (!error) return null;
  if (error.code === "23505") return errorResponse(409, "RELATION_DUPLICATE", "此客戶與物件已存在相同的有效關係。");
  if (error.code === "23503") return errorResponse(404, "RELATION_TARGET_NOT_FOUND", "找不到指定的客戶或物件。");
  if (error.code === "42501") return errorResponse(403, "RELATION_FORBIDDEN", "你沒有建立或修改關聯的權限。");
  if (error.code === "42P01" || error.code === "PGRST205") return errorResponse(503, "RELATION_SCHEMA_MISSING", "Preview 尚未完成關聯資料表設定。");
  return errorResponse(500, "RELATION_SAVE_FAILED", "關聯儲存失敗，請稍後再試。");
}

export async function POST(request: Request) {
  const current = await getCurrentProfile();
  if (!current) return errorResponse(401, "UNAUTHENTICATED", "請先登入。");
  if (!writeRoles.includes(current.profile.role)) return errorResponse(403, "RELATION_FORBIDDEN", "你沒有建立關聯的權限。");
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse(400, "INVALID_JSON", "請提供有效的 JSON 資料。"); }
  const parsed = relationInputSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "RELATION_VALIDATION", parsed.error.issues[0]?.message || "關聯欄位格式有誤。");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("people_properties").insert({ ...parsed.data, relationship_label: parsed.data.relationship_label || null, note: parsed.data.note || null, started_at: parsed.data.started_at || null, ended_at: parsed.data.ended_at || null, created_by: current.user.id });
  const mapped = mapDbError(error);
  if (mapped) return mapped;
  return NextResponse.json({ ok: true, message: "關聯已建立" }, { status: 201 });
}
