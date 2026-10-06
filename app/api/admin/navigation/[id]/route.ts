import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getAdminNavigationItem, navigationItemSchema } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
};

function revalidateNavigation(id: string, ...pageKeys: Array<string | null | undefined>) {
  revalidatePath("/");
  revalidatePath("/admin/navigation");
  revalidatePath(`/admin/navigation/${id}/edit`);
  for (const pageKey of pageKeys) {
    if (pageKey) revalidatePath(`/${pageKey}`);
  }
  revalidateTag("site-navigation");
}

function linkedPageKey(relation: unknown) {
  const page = Array.isArray(relation) ? relation[0] : relation;
  if (!page) return null;
  const pageKey = (page as { page_key?: unknown }).page_key;
  return typeof pageKey === "string" ? pageKey : null;
}

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  await requireRole(["editor", "admin", "owner"]);
  const { data: before } = await getAdminNavigationItem(id);
  if (!before) {
    return NextResponse.json({ ok: false, message: "找不到指定導覽項目。" }, { status: 404 });
  }

  const parsed = navigationItemSchema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "欄位格式不正確。" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("site_navigation_items")
    .update({
      ...parsed.data,
      page_id: parsed.data.page_id || null,
      href: parsed.data.href || null
    }, { count: "exact" })
    .eq("id", id)
    .select("id,site_pages(page_key)")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, message: `儲存失敗：${error.code || "update_failed"}` }, { status: 500 });
  }
  if (!data || count === 0) {
    return NextResponse.json({ ok: false, message: "沒有任何導覽項目被更新。" }, { status: 409 });
  }

  revalidateNavigation(id, before.site_pages?.page_key, linkedPageKey(data.site_pages));
  return NextResponse.json({ ok: true, redirectTo: "/admin/navigation?saved=1" });
}

export async function DELETE(_request: Request, { params }: Props) {
  const { id } = await params;
  await requireRole(["editor", "admin", "owner"]);
  const { data: before } = await getAdminNavigationItem(id);
  if (!before) {
    return NextResponse.json({ ok: false, message: "找不到指定導覽項目。" }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from("site_navigation_items")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, message: `刪除失敗：${error.code || "delete_failed"}` }, { status: 500 });
  }
  if (count === 0) {
    return NextResponse.json({ ok: false, message: "沒有任何導覽項目被刪除。" }, { status: 409 });
  }

  revalidateNavigation(id, before.site_pages?.page_key);
  return NextResponse.json({ ok: true, redirectTo: "/admin/navigation?saved=1" });
}
