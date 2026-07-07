import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { taipeiDateTimeLocalToUtcIso } from "@/lib/format";
import { homeCampaignSchema, nullable, valuesFromFormData } from "@/lib/home-cms/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

function actorEmail(current: Awaited<ReturnType<typeof requireRole>>) {
  return current.user.email || current.profile.email || null;
}

function actionForStatus(status: string) {
  if (status === "published") return "home_campaign_publish";
  if (status === "archived") return "home_campaign_archive";
  return "home_campaign_create";
}

export async function POST(request: Request) {
  const current = await requireRole(["editor", "admin", "owner"]);
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
    archived_at: parsed.data.status === "archived" ? new Date().toISOString() : null,
    created_by: current.user.id,
    updated_by: current.user.id
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("home_campaigns").insert(payload).select("*").single();
  if (error) {
    return NextResponse.json({ ok: false, message: `新增失敗：${error.code || "create_failed"}` }, { status: 500 });
  }

  await recordAuditLog({
    action: actionForStatus(data.status),
    resourceType: "home_campaign",
    resourceId: data.id,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role
  });

  revalidatePath("/");
  revalidatePath("/admin/home-campaigns");
  return NextResponse.json({
    ok: true,
    message: "Campaign 已儲存。",
    redirectTo: `/admin/home-campaigns/${data.id}/edit?saved=1`
  });
}
