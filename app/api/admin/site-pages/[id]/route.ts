import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { getSitePage } from "@/lib/home-cms/queries";
import { nullable, sitePageSchema, valuesFromFormData } from "@/lib/home-cms/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidateSitePageContent } from "@/lib/home-cms/revalidation";

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

const singletonPageTypes = ["philosophy", "services", "contact"];

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  const current = await requireRole(["editor", "admin", "owner"]);
  const { data: before } = await getSitePage(id);
  if (!before) {
    return NextResponse.json({ ok: false, message: "找不到指定頁面內容。" }, { status: 404 });
  }

  const parsed = sitePageSchema.safeParse(valuesFromFormData(await request.formData()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "欄位格式不正確。" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("site_pages")
    .select("id")
    .eq("page_key", parsed.data.page_key)
    .neq("id", id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: false, message: "此 Slug 已被使用，請改用其他 Slug；既有頁面不會被覆蓋。" }, { status: 409 });
  }
  if (singletonPageTypes.includes(parsed.data.page_type)) {
    const { data: existingType } = await supabase
      .from("site_pages")
      .select("id")
      .eq("page_type", parsed.data.page_type)
      .neq("id", id)
      .maybeSingle();
    if (existingType) {
      return NextResponse.json({ ok: false, message: "此頁面類型只能建立一筆；請編輯既有內容。" }, { status: 409 });
    }
  }

  const now = new Date().toISOString();
  const payload = {
    ...parsed.data,
    eyebrow: nullable(parsed.data.eyebrow),
    subtitle: nullable(parsed.data.subtitle),
    markdown_content: nullable(parsed.data.markdown_content),
    cover_media_id: nullable(parsed.data.cover_media_id),
    fallback_cover_url: nullable(parsed.data.fallback_cover_url),
    seo_title: nullable(parsed.data.seo_title),
    seo_description: nullable(parsed.data.seo_description),
    archived_at: parsed.data.status === "archived" ? before.archived_at || now : null,
    published_at: parsed.data.status === "published" ? before.published_at || now : before.published_at,
    updated_by: current.user.id
  };

  const { data, error, count } = await supabase
    .from("site_pages")
    .update(payload, { count: "exact" })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, message: "此 Slug 已被使用，請改用其他 Slug；既有頁面不會被覆蓋。" }, { status: 409 });
    }
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

  revalidateSitePageContent(before.page_key, data.page_key);
  revalidatePath("/admin/site-pages");
  revalidatePath(`/admin/site-pages/${id}/edit`);
  return NextResponse.json({
    ok: true,
    message: "頁面內容已儲存。",
    redirectTo: `/admin/site-pages/${id}/edit?saved=1`
  });
}

export async function DELETE(_request: Request, { params }: Props) {
  const { id } = await params;
  const current = await requireRole(["editor", "admin", "owner"]);
  const { data: before } = await getSitePage(id);
  if (!before) {
    return NextResponse.json({ ok: false, message: "找不到指定頁面內容。" }, { status: 404 });
  }
  if (before.page_type !== "reminder" && before.page_type !== "custom") {
    return NextResponse.json({ ok: false, message: "單例頁面不可刪除，請改用封存狀態。" }, { status: 409 });
  }

  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from("site_pages")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, message: `刪除失敗：${error.code || "delete_failed"}` }, { status: 500 });
  }
  if (count === 0) {
    return NextResponse.json({ ok: false, message: "沒有任何頁面內容被刪除。" }, { status: 409 });
  }

  await recordAuditLog({
    action: "site_page_delete",
    resourceType: "site_page",
    resourceId: id,
    beforeData: before,
    afterData: { deleted: true },
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role
  });

  revalidateSitePageContent(before.page_key);
  revalidatePath("/admin/site-pages");
  return NextResponse.json({
    ok: true,
    message: "頁面內容已刪除。",
    redirectTo: "/admin/site-pages?saved=1"
  });
}
