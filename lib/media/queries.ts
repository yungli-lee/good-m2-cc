import type { SupabaseClient } from "@supabase/supabase-js";
import { mediaBucketName } from "@/lib/media/constants";
import { mediaCategoryUsageTypes } from "@/lib/media/schema";
import type { MediaAsset, MediaStatus, MediaUsage, MediaUsageType } from "@/lib/media/types";
import type { MediaCategoryFilter, MediaSort } from "@/lib/media/schema";

export type MediaReference = {
  label: string;
  type: string;
  role: string;
};

export type MediaLibraryAsset = MediaAsset & {
  public_url: string;
  created_by_label: string | null;
  references: MediaReference[];
  usages: MediaUsage[];
};

type ListMediaInput = {
  supabase: SupabaseClient;
  q?: string;
  category?: MediaCategoryFilter;
  status?: MediaStatus;
  sort?: MediaSort;
};

function escapeSearchTerm(value: string) {
  return value.replace(/[%_]/g, "\\$&").replace(/,/g, " ");
}

function usageTypesForCategory(category: MediaCategoryFilter): MediaUsageType[] | null {
  if (category === "all") return null;
  return mediaCategoryUsageTypes[category];
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    hero_image: "Hero Image",
    inline_image: "Inline Image",
    gallery_image: "Gallery",
    cover_image: "Cover Image",
    floor_plan: "Floor Plan",
    document_image: "Document Image",
    company_logo: "Logo",
    company_line_qr: "LINE QR",
    hero_banner: "Hero Banner",
    thumbnail: "Thumbnail",
    general: "General"
  };
  return labels[role] || role;
}

async function mapCreatedByLabels(supabase: SupabaseClient, assets: MediaAsset[]) {
  const ids = Array.from(new Set(assets.map((asset) => asset.created_by).filter(Boolean))) as string[];
  if (!ids.length) return new Map<string, string>();

  const { data } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .in("id", ids);

  return new Map((data || []).map((profile) => [
    profile.id as string,
    (profile.display_name || profile.email || profile.id) as string
  ]));
}

async function mapReferences(supabase: SupabaseClient, usages: MediaUsage[]) {
  const references = new Map<string, MediaReference[]>();
  const contentIds = usages
    .filter((usage) => usage.used_by_type === "knowledge_article" || usage.used_by_type === "content_item")
    .map((usage) => usage.used_by_id);
  const propertyIds = usages
    .filter((usage) => usage.used_by_type === "property")
    .map((usage) => usage.used_by_id);

  const contentTitles = new Map<string, string>();
  if (contentIds.length) {
    const { data } = await supabase
      .from("content_items")
      .select("id,title")
      .in("id", Array.from(new Set(contentIds)));
    for (const item of data || []) contentTitles.set(item.id as string, item.title as string);
  }

  const propertyTitles = new Map<string, string>();
  if (propertyIds.length) {
    const { data } = await supabase
      .from("properties")
      .select("id,title")
      .in("id", Array.from(new Set(propertyIds)));
    for (const item of data || []) propertyTitles.set(item.id as string, item.title as string);
  }

  for (const usage of usages) {
    let label = usage.used_by_id;
    let type = usage.used_by_type;
    if (usage.used_by_type === "knowledge_article" || usage.used_by_type === "content_item") {
      label = contentTitles.get(usage.used_by_id) || usage.used_by_id;
      type = "Knowledge";
    } else if (usage.used_by_type === "property") {
      label = propertyTitles.get(usage.used_by_id) || usage.used_by_id;
      type = "Property";
    } else if (usage.used_by_type === "company_settings") {
      label = roleLabel(usage.usage_role);
      type = "Company";
    } else if (usage.used_by_type === "hero_banner") {
      label = roleLabel(usage.usage_role);
      type = "Hero";
    }

    const list = references.get(usage.media_id) || [];
    list.push({ label, type, role: roleLabel(usage.usage_role) });
    references.set(usage.media_id, list);
  }

  return references;
}

export async function listAdminMediaAssets(input: ListMediaInput) {
  let query = input.supabase
    .from("media_assets")
    .select("*");

  const status = input.status || "active";
  query = query.eq("status", status);
  if (status === "active") query = query.is("deleted_at", null);
  if (status === "deleted") query = query.not("deleted_at", "is", null);

  const usageTypes = usageTypesForCategory(input.category || "all");
  if (usageTypes?.length) query = query.in("usage_type", usageTypes);

  const q = input.q?.trim();
  if (q) {
    const term = `%${escapeSearchTerm(q)}%`;
    query = query.or(`original_filename.ilike.${term},alt_text.ilike.${term},caption.ilike.${term},usage_type.ilike.${term}`);
  }

  if (input.sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (input.sort === "name") {
    query = query.order("original_filename", { ascending: true, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(96);
  if (error) return { data: [] as MediaLibraryAsset[], error };

  const assets = (data || []) as MediaAsset[];
  const ids = assets.map((asset) => asset.id);
  let usages: MediaUsage[] = [];
  if (ids.length) {
    const { data: usageData } = await input.supabase
      .from("media_usages")
      .select("*")
      .in("media_id", ids)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    usages = (usageData || []) as MediaUsage[];
  }

  const createdByLabels = await mapCreatedByLabels(input.supabase, assets);
  const references = await mapReferences(input.supabase, usages);

  return {
    data: assets.map((asset) => {
      const { data: publicUrl } = input.supabase.storage.from(mediaBucketName).getPublicUrl(asset.storage_path);
      return {
        ...asset,
        public_url: publicUrl.publicUrl,
        created_by_label: asset.created_by ? createdByLabels.get(asset.created_by) || asset.created_by : null,
        references: references.get(asset.id) || [],
        usages: usages.filter((usage) => usage.media_id === asset.id)
      };
    }),
    error: null
  };
}
