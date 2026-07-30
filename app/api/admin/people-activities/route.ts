import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dateInputToTaipeiIso } from "@/lib/format";
export const runtime = "edge";
const fail = (status: number, code: string, message: string) => NextResponse.json({ ok: false, code, message }, { status });
const types = ["visit", "phone", "line", "sms", "email", "initial_contact", "requirement_discussion", "other"] as const;
export async function POST(request: Request) {
  const current = await getCurrentProfile();
  if (!current) return fail(401, "UNAUTHENTICATED", "請先登入。");
  if (!["editor", "admin", "owner"].includes(current.profile.role)) return fail(403, "ACTIVITY_FORBIDDEN", "你沒有建立客戶活動紀錄的權限。");
  let body: { person_id?: string; activity_type?: string; activity_date?: string; note?: string };
  try { body = await request.json(); } catch { return fail(400, "INVALID_JSON", "請提供有效的 JSON 資料。"); }
  if (!body.person_id || !/^[0-9a-f-]{36}$/i.test(body.person_id)) return fail(400, "INVALID_PERSON_ID", "客戶識別碼格式有誤。");
  if (!types.includes(body.activity_type as (typeof types)[number])) return fail(400, "INVALID_ACTIVITY_TYPE", "紀錄方式格式有誤。");
  const activityDate = dateInputToTaipeiIso(body.activity_date);
  if (!activityDate) return fail(400, "INVALID_ACTIVITY_DATE", "紀錄日期格式有誤。");
  if (body.note && body.note.length > 2000) return fail(400, "INVALID_NOTE", "備註不可超過 2000 字。");
  const supabase = await createSupabaseServerClient();
  const { data: person, error: personError } = await supabase.from("people").select("id").eq("id", body.person_id).maybeSingle();
  if (personError) return fail(personError.code === "42P01" || personError.code === "PGRST205" ? 503 : 500, "ACTIVITY_LOOKUP_FAILED", "客戶資料查詢失敗。");
  if (!person) return fail(404, "PERSON_NOT_FOUND", "找不到指定的客戶。");
  const { error } = await supabase.from("people_activities").insert({ person_id: body.person_id, activity_type: body.activity_type, activity_date: activityDate, note: body.note?.trim() || null, created_by: current.user.id });
  if (error) return fail(error.code === "42P01" || error.code === "PGRST205" ? 503 : error.code === "42501" ? 403 : 500, error.code === "42P01" || error.code === "PGRST205" ? "ACTIVITY_SCHEMA_MISSING" : error.code === "42501" ? "ACTIVITY_FORBIDDEN" : "ACTIVITY_SAVE_FAILED", error.code === "42P01" || error.code === "PGRST205" ? "Preview 尚未完成客戶活動資料表設定。" : error.code === "42501" ? "你沒有建立客戶活動紀錄的權限。" : "拜訪紀錄儲存失敗，請稍後再試。");
  return NextResponse.json({ ok: true, message: "拜訪紀錄已建立" }, { status: 201 });
}
