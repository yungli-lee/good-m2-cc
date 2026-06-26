import { createSupabaseServerClient } from "@/lib/supabase/server";

const publicPropertySelect = `
  *,
  property_media(*)
`;

export async function listPublishedProperties() {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("properties")
    .select(publicPropertySelect)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
}

export async function listFeaturedProperties(limit = 6) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("properties")
    .select(publicPropertySelect)
    .eq("status", "published")
    .eq("is_featured", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function getPublishedPropertyBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("properties")
    .select(publicPropertySelect)
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
}

export async function listAdminProperties() {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("properties")
    .select("id,title,slug,address_public,price,status,is_featured,published_at,updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
}

export async function getAdminPropertyById(id: string) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("properties")
    .select("*, property_media(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
}
