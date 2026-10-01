import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiError, requireApiRole } from "@/lib/auth-api";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseCollectionForm, propertyCollectionHref } from "./core";
import { collectionSelect, getAdminPropertyCollection } from "./queries";

export async function savePropertyCollection(request: Request, id?: string) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) return apiError("找不到主題。", 404);
  const before = id ? (await getAdminPropertyCollection(id)).data : null;
  if (id && !before) return apiError("找不到主題。", 404);
  let form: FormData;
  try { form = await request.formData(); } catch { return apiError("無法讀取表單。", 422); }
  const parsed = parseCollectionForm(form, before?.slug);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "請檢查主題設定。", 422);
  const supabase = await createSupabaseServerClient();
  const payload = { ...parsed.data, updated_by: auth.current!.user.id };
  // A saved short URL stays fixed, including through direct Data API updates.
  const { slug, ...changes } = payload;
  const query = before
    ? supabase.from("property_collections").update(changes).eq("id", id!)
    : supabase.from("property_collections").insert({ ...payload, slug, created_by: auth.current!.user.id });
  const { data, error } = await query.select(collectionSelect).single();
  if (error) {
    console.error("property_collection_save_failed", { code: error.code });
    return apiError(error.code === "23505" ? "這個網址名稱已使用，請換一個。" : "儲存失敗，請稍後再試。", error.code === "23505" ? 409 : 500);
  }
  await recordAuditLog({
    action: data.status === "published" ? "content_publish" : data.status === "archived" ? "content_unpublish" : before ? "content_update" : "content_create",
    resourceType: "property_collection", resourceId: data.id, beforeData: before, afterData: data,
    userId: auth.current!.user.id, userEmail: auth.current!.user.email, actorRole: auth.current!.profile.role
  });
  revalidatePath("/admin/property-collections");
  revalidatePath(`/admin/property-collections/${data.id}/edit`);
  revalidatePath(propertyCollectionHref(data.slug));
  return NextResponse.json({ data, redirectTo: `/admin/property-collections/${data.id}/edit?saved=1` }, { status: before ? 200 : 201 });
}
