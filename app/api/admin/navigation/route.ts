import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth";
import { navigationItemSchema } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

function revalidateNavigation(pageKey?: string | null) {
  revalidatePath("/");
  revalidatePath("/admin/navigation");
  if (pageKey) revalidatePath(`/${pageKey}`);
  revalidateTag("site-navigation");
}

function linkedPageKey(relation: unknown) {
  const page = Array.isArray(relation) ? relation[0] : relation;
  if (!page) return null;
  const pageKey = (page as { page_key?: unknown }).page_key;
  return typeof pageKey === "string" ? pageKey : null;
}

export async function POST(request: Request) {
  await requireRole(["editor", "admin", "owner"]);
  const parsed = navigationItemSchema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "欄位格式不正確。" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_navigation_items")
    .insert({
      ...parsed.data,
      page_id: parsed.data.page_id || null,
      href: parsed.data.href || null
    })
    .select("id,site_pages(page_key)")
    .single();
  if (error) {
    return NextResponse.json({ ok: false, message: `新增失敗：${error.code || "create_failed"}` }, { status: 500 });
  }

  revalidateNavigation(linkedPageKey(data.site_pages));
  return NextResponse.json({ ok: true, redirectTo: "/admin/navigation?saved=1" });
}
