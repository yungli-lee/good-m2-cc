import { createSupabaseServerClient } from "@/lib/supabase/server";

const publicPropertySelect = `
  id,
  slug,
  title,
  address_public,
  price,
  land_area_ping,
  building_area_ping,
  layout,
  age,
  orientation,
  floor,
  property_type,
  highlights,
  description,
  status,
  is_featured,
  sort_order,
  seo_title,
  meta_description,
  og_image_url,
  canonical_url,
  published_at,
  created_at,
  updated_at,
  deleted_at,
  property_media(*)
`;

const featuredPropertySelect = `
  id,
  slug,
  title,
  address_public,
  price,
  land_area_ping,
  building_area_ping,
  layout,
  highlights,
  status,
  is_featured,
  published_at,
  property_media(
    id,
    property_id,
    url,
    alt_text,
    sort_order,
    is_cover,
    deleted_at
  )
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

export async function listFeaturedProperties(limit = 3) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("properties")
    .select(featuredPropertySelect)
    .eq("status", "published")
    .eq("is_featured", true)
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
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

function escapeSearchTerm(value: string) {
  return value.replace(/[%_,]/g, "");
}

export async function listAdminProperties(search = "") {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("properties")
    .select(`
      id,
      title,
      slug,
      address_public,
      address_private,
      listing_no,
      listing_type,
      listing_start_date,
      listing_end_date,
      owner_name,
      owner_phone,
      developer_names,
      showing_instructions,
      price,
      land_area_ping,
      building_area_ping,
      layout,
      age,
      orientation,
      floor,
      property_type,
      highlights,
      description,
      status,
      is_featured,
      seo_title,
      meta_description,
      og_image_url,
      canonical_url,
      published_at,
      updated_at,
      property_media(
        id,
        property_id,
        url,
        is_cover,
        deleted_at
      )
    `)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const term = escapeSearchTerm(search.trim());
  if (term) {
    query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,listing_no.ilike.%${term}%,owner_name.ilike.%${term}%`);
  }

  return query;
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
