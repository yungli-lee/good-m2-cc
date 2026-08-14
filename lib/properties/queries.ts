import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  parsePropertySearch,
  propertySearchKeywordVariants,
  rankPropertySearchResults
} from "@/lib/properties/search";

const publicPropertySelect = `
  id,
  slug,
  title,
  address_public,
  city,
  district,
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
  city,
  district,
  price,
  land_area_ping,
  building_area_ping,
  layout,
  property_type,
  highlights,
  description,
  status,
  is_featured,
  sort_order,
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

export async function listPublishedPropertiesByArea(city: string, district: string, limit = 12) {
  const supabase = await createSupabaseServerClient();
  return publishedPropertiesQuery(supabase, publicPropertySelect)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit)
    .eq("city", city).eq("district", district);
}

export async function listFeaturedProperties(limit = 3) {
  const supabase = await createSupabaseServerClient();
  const query = publishedPropertiesQuery(supabase, featuredPropertySelect);
  return query
    .eq("is_featured", true)
    .order("sort_order", { ascending: true })
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
    .eq("is_featured", false)
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

export async function getPublicPropertyAvailability(slug: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.rpc("get_public_property_availability", { requested_slug: slug }).maybeSingle();
}

export async function searchPublishedProperties(input = "", limit = 24) {
  const { keywords, propertyTypes, price, priceMode } = parsePropertySearch(input);

  const supabase = await createSupabaseServerClient();
  const query = publishedPropertiesQuery(supabase, featuredPropertySelect);
  let searchQuery = query
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(Math.min(Math.max(limit * 4, 48), 192));

  if (price) {
    if (priceMode === "below") searchQuery = searchQuery.lte("price", price);
    else if (priceMode === "above") searchQuery = searchQuery.gte("price", price);
    else searchQuery = searchQuery.gte("price", Math.round(price * 0.85)).lte("price", Math.round(price * 1.15));
  }

  if (propertyTypes.length === 1) searchQuery = searchQuery.eq("property_type", propertyTypes[0]);
  else if (propertyTypes.length > 1) searchQuery = searchQuery.in("property_type", propertyTypes);

  for (const keyword of keywords) {
    const variants = propertySearchKeywordVariants(keyword);
    searchQuery = searchQuery.or(
      variants.flatMap((variant) => [
        `title.ilike.%${variant}%`,
        `slug.ilike.%${variant}%`,
        `address_public.ilike.%${variant}%`,
        `city.ilike.%${variant}%`,
        `district.ilike.%${variant}%`,
        `layout.ilike.%${variant}%`,
        `description.ilike.%${variant}%`
      ]).join(",")
    );
  }

  const result = await searchQuery;
  if (result.error) return result;
  return { ...result, data: rankPropertySearchResults(result.data || [], keywords, limit) };
}

export type AdminPropertyLifecycleFilter = "all" | "published" | "archived" | "expired" | "draft" | "deleted";

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
      city,
      district,
      unavailable_reason,
      unavailable_at,
      listing_no,
      listing_type,
      listing_start_date,
      listing_end_date,
      contract_signed_date,
      sale_motivation,
      sale_motivation_other,
      current_condition_type,
      current_condition_other,
      current_usage,
      current_usage_other,
      building_style,
      building_style_other,
      parking_type,
      parking_type_other,
      road_width,
      completion_date,
      has_addition,
      addition_description,
      elementary_school_district,
      junior_high_school_district,
      showing_meeting_location,
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
      expired_at,
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
