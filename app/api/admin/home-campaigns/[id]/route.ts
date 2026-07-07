import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { taipeiDateTimeLocalToUtcIso } from "@/lib/format";
import { getHomeCampaign } from "@/lib/home-cms/queries";
import { homeCampaignSchema, nullable, valuesFromFormData } from "@/lib/home-cms/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
};

function actorEmail(current: Awaited<ReturnType<typeof requireRole>>) {
  return current.user.email || current.profile.email || null;
}

function actionForStatus(status: string, isReorder = false) {
  if (isReorder) return "home_campaign_update";
  if (status === "published") return "home_campaign_publish";
  if (status === "archived") return "home_campaign_archive";
  return "home_campaign_update";
}

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  const current = await requireRole(["editor", "admin", "owner"]);
  const { data: before } = await getHomeCampaign(id);
  if (!before) {
    return NextResponse.json({ ok: false, message: "找不到指定 Campaign。" }, { status: 404 });
  }

  const parsed = homeCampaignSchema.safeParse(valuesFromFormData(await request.formData()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "欄位格式不正確。" }, { status: 400 });
  }

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
  const { data, error, count } = await supabase
    .from("home_campaigns")
    .update(payload, { count: "exact" })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: `儲存失敗：${error.code || "update_failed"}` }, { status: 500 });
  }
  if (!data || count === 0) {
    return NextResponse.json({ ok: false, message: "沒有任何 Campaign 被更新。" }, { status: 409 });
  }

  await recordAuditLog({
    action: actionForStatus(data.status, before.sort_order !== data.sort_order),
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
  revalidatePath(`/admin/home-campaigns/${id}/edit`);
  return NextResponse.json({
    ok: true,
    message: "Campaign 已儲存。",
    redirectTo: `/admin/home-campaigns/${id}/edit?saved=1`
  });
}
