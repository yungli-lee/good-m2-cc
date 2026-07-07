"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { taipeiDateTimeLocalToUtcIso } from "@/lib/format";
import { homeCampaignSchema, nullable, valuesFromFormData } from "@/lib/home-cms/schema";
import { getHomeCampaign } from "@/lib/home-cms/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function actorEmail(current: Awaited<ReturnType<typeof requireRole>>) {
  return current.user.email || current.profile.email || null;
}

function actionForStatus(status: string, fallback: "home_campaign_create" | "home_campaign_update", isReorder = false) {
  if (isReorder) return "home_campaign_reorder";
  if (status === "published") return "home_campaign_publish";
  if (status === "archived") return "home_campaign_archive";
  return fallback;
}

export async function createHomeCampaignAction(formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const parsed = homeCampaignSchema.safeParse(valuesFromFormData(formData));
  if (!parsed.success) redirect("/admin/home-campaigns/new?error=invalid_form");

  const supabase = await createSupabaseServerClient();
  const payload = {
    ...parsed.data,
    subtitle: nullable(parsed.data.subtitle),
    eyebrow: nullable(parsed.data.eyebrow),
    body: nullable(parsed.data.body),
    image_media_id: nullable(parsed.data.image_media_id),
    fallback_image_url: nullable(parsed.data.fallback_image_url),
    image_alt: nullable(parsed.data.image_alt),
    cta_label: nullable(parsed.data.cta_label),
    cta_href: nullable(parsed.data.cta_href),
    secondary_cta_label: nullable(parsed.data.secondary_cta_label),
    secondary_cta_href: nullable(parsed.data.secondary_cta_href),
    starts_at: taipeiDateTimeLocalToUtcIso(parsed.data.starts_at),
    ends_at: taipeiDateTimeLocalToUtcIso(parsed.data.ends_at),
    archived_at: parsed.data.status === "archived" ? new Date().toISOString() : null,
    created_by: current.user.id,
    updated_by: current.user.id
  };

  const { data, error } = await supabase.from("home_campaigns").insert(payload).select("*").single();
  if (error) redirect(`/admin/home-campaigns/new?error=${error.code || "create_failed"}`);

  await recordAuditLog({
    action: actionForStatus(data.status, "home_campaign_create"),
    resourceType: "home_campaign",
    resourceId: data.id,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role
  });

  revalidatePath("/");
  revalidatePath("/admin/home-campaigns");
  redirect(`/admin/home-campaigns/${data.id}/edit?saved=1`);
}

export async function updateHomeCampaignAction(id: string, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const { data: before } = await getHomeCampaign(id);
  if (!before) redirect("/admin/home-campaigns?error=not_found");

  const parsed = homeCampaignSchema.safeParse(valuesFromFormData(formData));
  if (!parsed.success) redirect(`/admin/home-campaigns/${id}/edit?error=invalid_form`);

  const payload = {
    ...parsed.data,
    subtitle: nullable(parsed.data.subtitle),
    eyebrow: nullable(parsed.data.eyebrow),
    body: nullable(parsed.data.body),
    image_media_id: nullable(parsed.data.image_media_id),
    fallback_image_url: nullable(parsed.data.fallback_image_url),
    image_alt: nullable(parsed.data.image_alt),
    cta_label: nullable(parsed.data.cta_label),
    cta_href: nullable(parsed.data.cta_href),
    secondary_cta_label: nullable(parsed.data.secondary_cta_label),
    secondary_cta_href: nullable(parsed.data.secondary_cta_href),
    starts_at: taipeiDateTimeLocalToUtcIso(parsed.data.starts_at),
    ends_at: taipeiDateTimeLocalToUtcIso(parsed.data.ends_at),
    archived_at: parsed.data.status === "archived" ? before.archived_at || new Date().toISOString() : null,
    updated_by: current.user.id
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("home_campaigns").update(payload).eq("id", id).select("*").single();
  if (error) redirect(`/admin/home-campaigns/${id}/edit?error=${error.code || "update_failed"}`);

  await recordAuditLog({
    action: actionForStatus(data.status, "home_campaign_update", before.sort_order !== data.sort_order),
    resourceType: "home_campaign",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role
  });

  revalidatePath("/");
  revalidatePath("/admin/home-campaigns");
  redirect(`/admin/home-campaigns/${id}/edit?saved=1`);
}
