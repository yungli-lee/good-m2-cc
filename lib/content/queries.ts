import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentCategory, ContentItem, ContentStatus, ContentTag } from "@/lib/content/types";

const contentItemSelect = `
  *,
  content_categories(id,name,slug),
  content_item_tags(content_tags(id,name,slug,description,deleted_at))
`;

const publicKnowledgeSelect = `
  id,
  content_type,
  status,
  legal_status,
  title,
  slug,
  summary,
  body,
  body_format,
  category_id,
  cover_image_url,
  seo_title,
  meta_description,
  og_image_url,
  canonical_url,
  published_at,
  first_published_at,
  is_featured,
  sort_order,
  ai_searchable,
  noindex,
  source_type,
  source_name,
  source_url,
  source_published_at,
  source_updated_at,
  effective_from,
  effective_to,
  last_reviewed_at,
  next_review_at,
  review_cycle_days,
  review_owner,
  version,
  supersedes_id,
  superseded_by_id,
  created_by,
  updated_by,
  deleted_at,
  created_at,
  updated_at,
  content_categories(id,name,slug),
  content_item_tags(content_tags(id,name,slug,description,deleted_at))
`;

function publicKnowledgeQuery(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return supabase
    .from("content_items")
    .select(publicKnowledgeSelect)
    .eq("content_type", "knowledge")
    .eq("status", "published")
    .eq("noindex", false)
    .not("published_at", "is", null)
    .is("deleted_at", null)
    .or("legal_status.is.null,legal_status.eq.current");
}

export type KnowledgeListFilter = "all" | ContentStatus | "deleted" | "review";

export async function listKnowledgeItems(options: { q?: string; filter?: KnowledgeListFilter } = {}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("content_items")
    .select(contentItemSelect)
    .eq("content_type", "knowledge")
    .order("updated_at", { ascending: false });

  if (options.filter === "deleted") {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
    if (options.filter && options.filter !== "all" && options.filter !== "review") {
      query = query.eq("status", options.filter);
    }
  }

  if (options.q) {
    const term = options.q.replace(/[%_,]/g, " ").trim();
    if (term) query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("knowledge_list_failed", { code: error.code, message: error.message });
    return { data: [] as ContentItem[], error };
  }

  const items = (data || []) as ContentItem[];
  if (options.filter !== "review") return { data: items, error: null };

  const now = Date.now();
  return {
    data: items.filter((item) => item.legal_status === "pending_review" || (item.next_review_at && Date.parse(item.next_review_at) <= now)),
    error: null
  };
}

export async function getKnowledgeItem(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_items")
    .select(contentItemSelect)
    .eq("id", id)
    .eq("content_type", "knowledge")
    .maybeSingle();

  if (error) console.error("knowledge_item_failed", { code: error.code, message: error.message });
  return { data: data as ContentItem | null, error };
}

export async function listKnowledgeCategories() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_categories")
    .select("id,content_type,name,slug,description,sort_order,deleted_at")
    .or("content_type.is.null,content_type.eq.knowledge")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) console.error("knowledge_categories_failed", { code: error.code, message: error.message });
  return (data || []) as ContentCategory[];
}

export async function listContentTags() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_tags")
    .select("id,name,slug,description,deleted_at")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) console.error("content_tags_failed", { code: error.code, message: error.message });
  return (data || []) as ContentTag[];
}

export async function listPublicKnowledgeItems(limit = 24) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await publicKnowledgeQuery(supabase)
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("public_knowledge_list_failed", { code: error.code, message: error.message });
    return { data: [] as ContentItem[], error };
  }

  return { data: (data || []) as unknown as ContentItem[], error: null };
}

export async function getPublicKnowledgeBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await publicKnowledgeQuery(supabase)
    .eq("slug", slug)
    .maybeSingle();

  if (error) console.error("public_knowledge_item_failed", { code: error.code, message: error.message });
  return { data: data as unknown as ContentItem | null, error };
}
