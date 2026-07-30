import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";
const fail = (status: number, code: string, message: string) => NextResponse.json({ ok: false, code, message }, { status });
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentProfile();
  if (!current) return fail(401, "UNAUTHENTICATED", "請先登入。");
  if (!["editor", "admin", "owner"].includes(current.profile.role)) return fail(403, "RELATION_FORBIDDEN", "你沒有封存關聯的權限。");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(400, "INVALID_RELATION_ID", "關聯識別碼格式有誤。");
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: lookupError } = await supabase.from("people_properties").select("id").eq("id", id).maybeSingle();
  if (lookupError) return fail(lookupError.code === "42P01" || lookupError.code === "PGRST205" ? 503 : 500, lookupError.code === "42P01" || lookupError.code === "PGRST205" ? "RELATION_SCHEMA_MISSING" : "RELATION_LOOKUP_FAILED", lookupError.code === "42P01" || lookupError.code === "PGRST205" ? "Preview 尚未完成關聯資料表設定。" : "關聯查詢失敗，請稍後再試。");
  if (!existing) return fail(404, "RELATION_NOT_FOUND", "找不到指定的關聯。");
  const now = new Date().toISOString();
  const { error } = await supabase.from("people_properties").update({ status: "archived", archived_at: now, ended_at: now }).eq("id", id);
  if (error) return fail(error.code === "42501" ? 403 : 500, error.code === "42501" ? "RELATION_FORBIDDEN" : "RELATION_ARCHIVE_FAILED", error.code === "42501" ? "你沒有封存關聯的權限。" : "關聯封存失敗，請稍後再試。");
  return NextResponse.json({ ok: true, message: "關聯已封存" });
}
