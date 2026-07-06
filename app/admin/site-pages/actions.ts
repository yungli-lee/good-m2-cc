"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { nullable, sitePageSchema, valuesFromFormData } from "@/lib/home-cms/schema";
import { getSitePage } from "@/lib/home-cms/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function actorEmail(current: Awaited<ReturnType<typeof requireRole>>) {
  return current.user.email || current.profile.email || null;
}

function actionForStatus(status: string, fallback: "site_page_create" | "site_page_update") {
  if (status === "published") return "site_page_publish";
  if (status === "archived") return "site_page_archive";
  return fallback;
}

export async function createSitePageAction(formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const parsed = sitePageSchema.safeParse(valuesFromFormData(formData));
  if (!parsed.success) redirect("/admin/site-pages/new?error=invalid_form");

  const payload = {
    ...parsed.data,
    subtitle: nullable(parsed.data.subtitle),
    markdown_content: nullable(parsed.data.markdown_content),
    cover_media_id: nullable(parsed.data.cover_media_id),
    fallback_cover_url: nullable(parsed.data.fallback_cover_url),
    seo_title: nullable(parsed.data.seo_title),
    seo_description: nullable(parsed.data.seo_description),
    archived_at: parsed.data.status === "archived" ? new Date().toISOString() : null,
    created_by: current.user.id,
    updated_by: current.user.id
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("site_pages").insert(payload).select("*").single();
  if (error) redirect(`/admin/site-pages/new?error=${error.code || "create_failed"}`);

  await recordAuditLog({
    action: actionForStatus(data.status, "site_page_create"),
    resourceType: "site_page",
    resourceId: data.id,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role
  });

  revalidatePath("/");
  revalidatePath("/admin/site-pages");
  redirect(`/admin/site-pages/${data.id}/edit?saved=1`);
}

export async function updateSitePageAction(id: string, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const { data: before } = await getSitePage(id);
  if (!before) redirect("/admin/site-pages?error=not_found");

  const parsed = sitePageSchema.safeParse(valuesFromFormData(formData));
  if (!parsed.success) redirect(`/admin/site-pages/${id}/edit?error=invalid_form`);

  const payload = {
    ...parsed.data,
    subtitle: nullable(parsed.data.subtitle),
    markdown_content: nullable(parsed.data.markdown_content),
    cover_media_id: nullable(parsed.data.cover_media_id),
    fallback_cover_url: nullable(parsed.data.fallback_cover_url),
    seo_title: nullable(parsed.data.seo_title),
    seo_description: nullable(parsed.data.seo_description),
    archived_at: parsed.data.status === "archived" ? before.archived_at || new Date().toISOString() : null,
    updated_by: current.user.id
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("site_pages").update(payload).eq("id", id).select("*").single();
  if (error) redirect(`/admin/site-pages/${id}/edit?error=${error.code || "update_failed"}`);

  await recordAuditLog({
    action: actionForStatus(data.status, "site_page_update"),
    resourceType: "site_page",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role
  });

  revalidatePath("/");
  revalidatePath("/admin/site-pages");
  redirect(`/admin/site-pages/${id}/edit?saved=1`);
}
