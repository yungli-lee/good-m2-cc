import { NextResponse } from "next/server";
import { apiError, requireApiRole } from "@/lib/auth-api";
import { parseCollectionForm, propertyCollectionFilters } from "@/lib/property-collections/core";
import { searchPublishedProperties } from "@/lib/properties/queries";
export const runtime = "edge";
export async function POST(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  let form: FormData;
  try { form = await request.formData(); } catch { return apiError("無法讀取表單。", 422); }
  const parsed = parseCollectionForm(form, "preview");
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "請檢查搜尋條件。", 422);
  const filters = propertyCollectionFilters(parsed.data);
  const { data, error } = await searchPublishedProperties(filters.q, 1000, filters);
  if (error) return apiError("讀取物件失敗，請稍後重試。", 500);
  return NextResponse.json({ data, title: parsed.data.title, description: parsed.data.description, cover_storage_path: parsed.data.cover_storage_path }, { headers: { "Cache-Control": "no-store" } });
}
