import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { nullable, sitePageSchema, valuesFromFormData } from "@/lib/home-cms/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

function actorEmail(current: Awaited<ReturnType<typeof requireRole>>) {
  return current.user.email || current.profile.email || null;
}

function actionForStatus(status: string) {
  if (status === "published") return "site_page_publish";
  if (status === "archived") return "site_page_archive";
  return "site_page_create";
}

export async function POST(request: Request) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const parsed = sitePageSchema.safeParse(valuesFromFormData(await request.formData()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "欄位格式不正確。" }, { status: 400 });
  }

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
  if (error) {
    return NextResponse.json({ ok: false, message: `新增失敗：${error.code || "create_failed"}` }, { status: 500 });
  }

  await recordAuditLog({
    action: actionForStatus(data.status),
    resourceType: "site_page",
    resourceId: data.id,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role
  });

  revalidatePath("/");
  revalidatePath("/admin/site-pages");
  return NextResponse.json({
    ok: true,
    message: "頁面內容已儲存。",
    redirectTo: `/admin/site-pages/${data.id}/edit?saved=1`
  });
}
