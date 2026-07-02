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

function publicKnowledgeQuery(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  options?: { count?: "exact" }
) {
  return supabase
    .from("content_items")
    .select(publicKnowledgeSelect, options)
    .eq("content_type", "knowledge")
    .eq("status", "published")
    .eq("noindex", false)
    .not("published_at", "is", null)
    .is("deleted_at", null)
    .or("legal_status.is.null,legal_status.eq.current");
}

export type KnowledgeListFilter = "all" | ContentStatus | "deleted" | "review";
export type PublicKnowledgeListOptions = {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
};

const publicKnowledgePageSize = 12;

function normalizePublicSearchTerm(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/[%,()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function normalizePublicSlug(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 120);
}

function positiveInteger(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.floor(numberValue) : fallback;
}

async function publicKnowledgeSearchIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  term: string
) {
  if (!term) return { categoryIds: [] as string[], itemIds: [] as string[] };

  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase
      .from("content_categories")
      .select("id")
      .or(`name.ilike.%${term}%,slug.ilike.%${term}%`)
      .or("content_type.is.null,content_type.eq.knowledge")
      .is("deleted_at", null)
      .limit(30),
    supabase
      .from("content_tags")
      .select("id,content_item_tags(content_id)")
      .or(`name.ilike.%${term}%,slug.ilike.%${term}%`)
      .is("deleted_at", null)
      .limit(30)
  ]);

  const categoryIds = ((categories || []) as Array<{ id: string }>).map((category) => category.id);
  const itemIds = ((tags || []) as Array<{ content_item_tags?: Array<{ content_id?: string | null }> | null }>)
    .flatMap((tag) => tag.content_item_tags || [])
    .map((relation) => relation.content_id)
    .filter(Boolean) as string[];

  return {
    categoryIds: Array.from(new Set(categoryIds)),
    itemIds: Array.from(new Set(itemIds))
  };
}

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

export async function listPublicKnowledgeItems(options: number | PublicKnowledgeListOptions = 24) {
  const supabase = await createSupabaseServerClient();
  const legacyLimit = typeof options === "number" ? options : null;
  const optionInput = typeof options === "number" ? {} : options;
  const pageSize = legacyLimit || positiveInteger(optionInput.pageSize, publicKnowledgePageSize);
  const page = legacyLimit ? 1 : positiveInteger(optionInput.page, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const q = normalizePublicSearchTerm(optionInput.q);
  const categorySlug = normalizePublicSlug(optionInput.category);

  let categoryId: string | null = null;
  if (categorySlug) {
    const { data: category, error: categoryError } = await supabase
      .from("content_categories")
      .select("id")
      .eq("slug", categorySlug)
      .or("content_type.is.null,content_type.eq.knowledge")
      .is("deleted_at", null)
      .maybeSingle();

    if (categoryError) {
      console.error("public_knowledge_category_failed", { code: categoryError.code, message: categoryError.message });
      return { data: [] as ContentItem[], error: categoryError, count: 0, page, pageSize, totalPages: 0 };
    }
    if (!category) return { data: [] as ContentItem[], error: null, count: 0, page, pageSize, totalPages: 0 };
    categoryId = category.id as string;
  }

  const searchIds = await publicKnowledgeSearchIds(supabase, q);
  let query = publicKnowledgeQuery(supabase, { count: "exact" });

  if (categoryId) query = query.eq("category_id", categoryId);
  if (q) {
    const filters = [
      `title.ilike.%${q}%`,
      `summary.ilike.%${q}%`,
      `body.ilike.%${q}%`
    ];
    if (searchIds.categoryIds.length) filters.push(`category_id.in.(${searchIds.categoryIds.join(",")})`);
    if (searchIds.itemIds.length) filters.push(`id.in.(${searchIds.itemIds.join(",")})`);
    query = query.or(filters.join(","));
  }

  const { data, error, count } = await query
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("public_knowledge_list_failed", { code: error.code, message: error.message });
    return { data: [] as ContentItem[], error, count: 0, page, pageSize, totalPages: 0 };
  }

  return {
    data: (data || []) as unknown as ContentItem[],
    error: null,
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  };
}

export async function getPublicKnowledgeBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await publicKnowledgeQuery(supabase)
    .eq("slug", slug)
    .maybeSingle();

  if (error) console.error("public_knowledge_item_failed", { code: error.code, message: error.message });
  return { data: data as unknown as ContentItem | null, error };
}
