import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PropertyCollection } from "./core";

// Shared public/admin data contains no actor IDs or internal customer information.
export const collectionSelect = "id,slug,title,description,q,city,districts,property_type,price_min,price_max,cover_storage_path,status,created_at,updated_at";
export async function listAdminPropertyCollections() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("property_collections").select(collectionSelect).order("updated_at", { ascending: false });
  return { data: (data || []) as PropertyCollection[], error };
}
export async function getAdminPropertyCollection(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("property_collections").select(collectionSelect).eq("id", id).maybeSingle();
  return { data: data as PropertyCollection | null, error };
}
export const getPublishedPropertyCollection = cache(async (slug: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("property_collections").select(collectionSelect).eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) console.error("property_collection_read_failed", { code: error.code });
  return data as PropertyCollection | null;
});

export async function listPublishedPropertyCollectionLinks() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("property_collections").select("slug,updated_at").eq("status", "published").order("updated_at", { ascending: false }).limit(1000);
  if (error) console.error("property_collection_sitemap_failed", { code: error.code });
  return (data || []) as Array<{ slug: string; updated_at: string }>;
}
