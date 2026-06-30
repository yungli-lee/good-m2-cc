import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentCategory, ContentItem, ContentStatus, ContentTag } from "@/lib/content/types";

const contentItemSelect = `
  *,
  content_categories(id,name,slug),
  content_item_tags(content_tags(id,name,slug,description,deleted_at))
`;

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

