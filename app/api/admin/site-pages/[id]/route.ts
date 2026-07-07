import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { getSitePage } from "@/lib/home-cms/queries";
import { nullable, sitePageSchema, valuesFromFormData } from "@/lib/home-cms/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
};

function actorEmail(current: Awaited<ReturnType<typeof requireRole>>) {
  return current.user.email || current.profile.email || null;
}

function actionForStatus(status: string) {
  if (status === "published") return "site_page_publish";
  if (status === "archived") return "site_page_archive";
  return "site_page_update";
}

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  const current = await requireRole(["editor", "admin", "owner"]);
  const { data: before } = await getSitePage(id);
  if (!before) {
    return NextResponse.json({ ok: false, message: "找不到指定頁面內容。" }, { status: 404 });
  }

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
    archived_at: parsed.data.status === "archived" ? before.archived_at || new Date().toISOString() : null,
    updated_by: current.user.id
  };

  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("site_pages")
    .update(payload, { count: "exact" })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: `儲存失敗：${error.code || "update_failed"}` }, { status: 500 });
  }
  if (!data || count === 0) {
    return NextResponse.json({ ok: false, message: "沒有任何頁面內容被更新。" }, { status: 409 });
  }

  await recordAuditLog({
    action: actionForStatus(data.status),
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
  revalidatePath(`/admin/site-pages/${id}/edit`);
  return NextResponse.json({
    ok: true,
    message: "頁面內容已儲存。",
    redirectTo: `/admin/site-pages/${id}/edit?saved=1`
  });
}
