import type { SupabaseClient } from "@supabase/supabase-js";
import { mediaBucketName } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HomeCampaign, SitePage } from "@/lib/home-cms/types";

function withPublicUrl<T extends { media_assets?: { storage_path?: string | null } | null }>(supabase: SupabaseClient, item: T) {
  const path = item.media_assets?.storage_path;
  if (!path) return { ...item, media_public_url: null };
  const { data } = supabase.storage.from(mediaBucketName).getPublicUrl(path);
  return { ...item, media_public_url: data.publicUrl };
}

const homeCampaignSelect = "*,media_assets(id,storage_path,alt_text,caption,original_filename,media_type,mime_type,file_size,poster_url,poster_storage_path)";
const sitePageSelect = "*,media_assets(id,storage_path,alt_text,caption,original_filename)";

export async function listActiveHomeCampaigns() {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("home_campaigns")
    .select(homeCampaignSelect)
    .eq("status", "published")
    .is("archived_at", null)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("active_home_campaigns_failed", { code: error.code, message: error.message });
    return [] as Array<HomeCampaign & { media_public_url: string | null }>;
  }

  return ((data || []) as HomeCampaign[]).map((item) => withPublicUrl(supabase, item));
}

export async function listAdminHomeCampaigns() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("home_campaigns")
    .select(homeCampaignSelect)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) return { data: [] as HomeCampaign[], error };
  return { data: (data || []) as HomeCampaign[], error: null };
}

export async function getHomeCampaign(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("home_campaigns")
    .select(homeCampaignSelect)
    .eq("id", id)
    .maybeSingle();
  return { data: data as HomeCampaign | null, error };
}

export async function listPublishedSitePages() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_pages")
    .select(sitePageSelect)
    .eq("status", "published")
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("published_site_pages_failed", { code: error.code, message: error.message });
    return [] as Array<SitePage & { media_public_url: string | null }>;
  }

  return ((data || []) as SitePage[]).map((page) => withPublicUrl(supabase, page));
}

export async function listAdminSitePages() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_pages")
    .select(sitePageSelect)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("page_key", { ascending: true });
  if (error) return { data: [] as SitePage[], error };
  return { data: (data || []) as SitePage[], error: null };
}

export async function getSitePage(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_pages")
    .select(sitePageSelect)
    .eq("id", id)
    .maybeSingle();
  return { data: data as SitePage | null, error };
}

export async function getPublishedSitePageBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_pages")
    .select(sitePageSelect)
    .eq("page_key", slug)
    .eq("status", "published")
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    console.error("published_site_page_failed", { code: error.code, message: error.message, slug });
    return { data: null as (SitePage & { media_public_url: string | null }) | null, error };
  }

  return {
    data: data ? withPublicUrl(supabase, data as SitePage) : null,
    error: null
  };
}

export async function getPublishedSitePageByType(pageType: SitePage["page_type"]) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_pages")
    .select(sitePageSelect)
    .eq("page_type", pageType)
    .eq("status", "published")
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("published_site_page_type_failed", { code: error.code, message: error.message, pageType });
    return { data: null as (SitePage & { media_public_url: string | null }) | null, error };
  }

  return {
    data: data ? withPublicUrl(supabase, data as SitePage) : null,
    error: null
  };
}
