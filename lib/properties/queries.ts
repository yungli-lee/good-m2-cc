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

function publishedPropertiesQuery<const Select extends string>(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  select: Select
) {
  return supabase
    .from("properties")
    .select(select)
    .eq("status", "published")
    .not("published_at", "is", null)
    .is("deleted_at", null);
}

export async function listPublishedProperties() {
  const supabase = await createSupabaseServerClient();
  const query = publishedPropertiesQuery(supabase, publicPropertySelect);
  return query
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false });
}

export async function listFeaturedProperties(limit = 3) {
  const supabase = await createSupabaseServerClient();
  const query = publishedPropertiesQuery(supabase, featuredPropertySelect);
  return query
    .eq("is_featured", true)
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);
}

export async function getFeaturedPublishedProperties(limit = 12) {
  return listFeaturedProperties(limit);
}

export async function getLatestPublishedProperties(limit = 12) {
  const supabase = await createSupabaseServerClient();
  const query = publishedPropertiesQuery(supabase, featuredPropertySelect);
  return query
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);
}

export async function getPublishedPropertyBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const query = publishedPropertiesQuery(supabase, publicPropertySelect);
  return query
    .eq("slug", slug)
    .maybeSingle();
}

function escapeSearchTerm(value: string) {
  return value.replace(/[%_,]/g, "");
}

function priceFromWan(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

function propertyTypeKeyword(value: string) {
  const keywords: Array<[string, string]> = [
    ["農舍", "farmhouse"],
    ["農地", "farmland"],
    ["建地", "building_land"],
    ["工業用地", "industrial_land"],
    ["廠房", "factory"],
    ["大廈", "building"],
    ["公寓", "apartment"],
    ["透天", "townhouse"],
    ["房屋", "townhouse"],
    ["店面", "storefront"]
  ];
  return keywords.find(([keyword]) => value.includes(keyword))?.[1] || "";
}

export async function searchPublishedProperties(input = "", limit = 24) {
  const rawTerm = input.trim();
  const term = escapeSearchTerm(rawTerm);
  const propertyType = propertyTypeKeyword(rawTerm);
  const price = priceFromWan(rawTerm);
  const isBelow = /以下|以內|內|below|under/i.test(rawTerm);
  const isAbove = /以上|起|above|over/i.test(rawTerm);

  const supabase = await createSupabaseServerClient();
  const query = publishedPropertiesQuery(supabase, featuredPropertySelect);
  let searchQuery = query
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (price) {
    if (isBelow) searchQuery = searchQuery.lte("price", price);
    else if (isAbove) searchQuery = searchQuery.gte("price", price);
    else searchQuery = searchQuery.gte("price", Math.round(price * 0.85)).lte("price", Math.round(price * 1.15));
  }

  if (propertyType) searchQuery = searchQuery.eq("property_type", propertyType);

  if (term && !/^\d+(?:\.\d+)?\s*萬?(?:以下|以內|內|以上|起)?$/.test(term)) {
    searchQuery = searchQuery.or(
      [
        `title.ilike.%${term}%`,
        `slug.ilike.%${term}%`,
        `address_public.ilike.%${term}%`,
        `layout.ilike.%${term}%`,
        `description.ilike.%${term}%`
      ].join(",")
    );
  }

  return searchQuery;
}

export type AdminPropertyLifecycleFilter = "all" | "published" | "archived" | "draft" | "deleted";

export async function listAdminProperties(search = "", filter: AdminPropertyLifecycleFilter = "all") {
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
      deleted_at,
      deleted_by,
      delete_reason,
      property_media(
        id,
        property_id,
        url,
        is_cover,
        deleted_at
      )
    `)
    .order("updated_at", { ascending: false });

  if (filter === "deleted") {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
    if (filter !== "all") query = query.eq("status", filter);
  }

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
    .maybeSingle();
}
