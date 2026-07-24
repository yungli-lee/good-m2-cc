"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminNavigationItem, navigationItemSchema } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function navigationPayload(formData: FormData) {
  return navigationItemSchema.safeParse(Object.fromEntries(formData.entries()));
}

function revalidateNavigation(pageKey?: string | null) {
  revalidatePath("/");
  revalidatePath("/contact");
  revalidatePath("/properties");
  revalidatePath("/knowledge");
  revalidatePath("/calculator");
  if (pageKey) revalidatePath(`/${pageKey}`);
  revalidateTag("site-navigation");
}

export async function createNavigationItemAction(formData: FormData) {
  await requireRole(["editor", "admin", "owner"]);
  const parsed = navigationPayload(formData);
  if (!parsed.success) redirect("/admin/navigation/new?error=invalid_form");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_navigation_items")
    .insert({
      ...parsed.data,
      page_id: parsed.data.page_id || null,
      href: parsed.data.href || null
    })
    .select("*,site_pages(page_key)")
    .single();
  if (error) redirect(`/admin/navigation/new?error=${error.code || "create_failed"}`);
  revalidateNavigation(data.site_pages?.page_key);
  redirect("/admin/navigation?saved=1");
}

export async function updateNavigationItemAction(id: string, formData: FormData) {
  await requireRole(["editor", "admin", "owner"]);
  const parsed = navigationPayload(formData);
  if (!parsed.success) redirect(`/admin/navigation/${id}/edit?error=invalid_form`);
  const { data: before } = await getAdminNavigationItem(id);
  if (!before) redirect("/admin/navigation?error=not_found");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_navigation_items")
    .update({
      ...parsed.data,
      page_id: parsed.data.page_id || null,
      href: parsed.data.href || null
    })
    .eq("id", id)
    .select("*,site_pages(page_key)")
    .single();
  if (error) redirect(`/admin/navigation/${id}/edit?error=${error.code || "update_failed"}`);
  revalidateNavigation(before.site_pages?.page_key);
  revalidateNavigation(data.site_pages?.page_key);
  redirect("/admin/navigation?saved=1");
}

export async function deleteNavigationItemAction(id: string) {
  await requireRole(["editor", "admin", "owner"]);
  const { data: before } = await getAdminNavigationItem(id);
  if (!before) redirect("/admin/navigation?error=not_found");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("site_navigation_items").delete().eq("id", id);
  if (error) redirect(`/admin/navigation?error=${error.code || "delete_failed"}`);
  revalidateNavigation(before.site_pages?.page_key);
  redirect("/admin/navigation?saved=1");
}
