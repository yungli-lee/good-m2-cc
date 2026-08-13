"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { areaPageSchema, areaPayload, areaValuesFromFormData, getAdminAreaPage } from "@/lib/areas-cms";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function timestamps(status: string, before?: { published_at: string | null; archived_at: string | null } | null) {
  const now = new Date().toISOString();
  return { published_at: status === "published" ? before?.published_at || now : before?.published_at || null, archived_at: status === "archived" ? before?.archived_at || now : null };
}
function refresh(slug: string) { revalidatePath("/areas"); revalidatePath(`/areas/${slug}`); revalidatePath("/sitemap.xml"); revalidatePath("/admin/areas"); }

export async function createAreaAction(formData: FormData) {
  const current = await requireRole(["editor","admin","owner"]);
  const parsed = areaPageSchema.safeParse(areaValuesFromFormData(formData));
  if (!parsed.success) redirect("/admin/areas/new?error=invalid_form");
  const supabase = await createSupabaseServerClient();
  const payload = { ...areaPayload(parsed.data), ...timestamps(parsed.data.status), created_by: current.user.id, updated_by: current.user.id };
  const { data, error } = await supabase.from("area_pages").insert(payload).select("*").single();
  if (error) redirect(`/admin/areas/new?error=${error.code || "create_failed"}`);
  await recordAuditLog({ action: "site_page_create", resourceType: "area_page", resourceId: data.id, afterData: data, userId: current.user.id, userEmail: current.user.email });
  refresh(data.slug); redirect(`/admin/areas/${data.id}/edit?saved=1`);
}

export async function updateAreaAction(id: string, formData: FormData) {
  const current = await requireRole(["editor","admin","owner"]);
  const { data: before } = await getAdminAreaPage(id); if (!before) redirect("/admin/areas?error=not_found");
  const parsed = areaPageSchema.safeParse(areaValuesFromFormData(formData));
  if (!parsed.success) redirect(`/admin/areas/${id}/edit?error=invalid_form`);
  const supabase = await createSupabaseServerClient();
  const payload = { ...areaPayload(parsed.data), ...timestamps(parsed.data.status, before), updated_by: current.user.id };
  const { data, error } = await supabase.from("area_pages").update(payload).eq("id", id).select("*").single();
  if (error) redirect(`/admin/areas/${id}/edit?error=${error.code || "update_failed"}`);
  await recordAuditLog({ action: "site_page_update", resourceType: "area_page", resourceId: id, beforeData: before, afterData: data, userId: current.user.id, userEmail: current.user.email });
  refresh(before.slug); refresh(data.slug); redirect(`/admin/areas/${id}/edit?saved=1`);
}
