import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  resolveNavigationItem,
  type NavigationItem,
  type NavigationLocation,
  type ResolvedNavigationItem
} from "@/lib/navigation-core";

export {
  navigationItemSchema,
  navigationLocations,
  resolveNavigationItem
} from "@/lib/navigation-core";
export type {
  NavigationItem,
  NavigationLocation,
  NavigationTarget,
  ResolvedNavigationItem
} from "@/lib/navigation-core";

const navigationSelect = "*,site_pages(page_key,page_type,status,archived_at,show_as_page,show_on_homepage)";
const navigationPageSelect = "page_key,page_type,status,archived_at,show_as_page,show_on_homepage";

export async function getAllPublicNavigationItems() {
  const supabase = await createSupabaseServerClient();
  const [navigationResult, pagesResult] = await Promise.all([
    supabase.from("site_navigation_items").select(navigationSelect).eq("is_visible", true).order("location", { ascending: true }).order("sort_order", { ascending: true }).order("id", { ascending: true }),
    supabase.from("site_pages").select(navigationPageSelect).eq("status", "published").is("archived_at", null)
  ]);
  if (navigationResult.error || pagesResult.error) {
    const error = navigationResult.error || pagesResult.error;
    console.error("public_navigation_failed", { code: error?.code, message: error?.message });
    return [] as ResolvedNavigationItem[];
  }
  const pages = (pagesResult.data || []) as unknown as NonNullable<NavigationItem["site_pages"]>[];
  return ((navigationResult.data || []) as unknown as NavigationItem[])
    .map((item) => resolveNavigationItem(item, pages))
    .filter((item): item is ResolvedNavigationItem => Boolean(item));
}

export async function getPublicNavigationItems(location: NavigationLocation) {
  const items = await getAllPublicNavigationItems();
  return items.filter((item) => item.location === location);
}

export async function listAdminNavigationItems() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_navigation_items")
    .select(navigationSelect)
    .order("location", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  return { data: (data || []) as unknown as NavigationItem[], error };
}

export async function getAdminNavigationItem(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_navigation_items")
    .select(navigationSelect)
    .eq("id", id)
    .maybeSingle();
  return { data: data as unknown as NavigationItem | null, error };
}
