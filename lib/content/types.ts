export type ContentType = "knowledge" | "blog" | "faq" | "market_report" | "case_study" | "news" | "ai_source";
export type ContentStatus = "draft" | "published" | "archived";
export type LegalStatus = "current" | "outdated" | "pending_review" | "draft" | "archived";

export type ContentCategory = {
  id: string;
  content_type: ContentType | null;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  deleted_at: string | null;
};

export type ContentTag = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  deleted_at: string | null;
};

export type ContentItemTag = {
  content_tags: ContentTag | null;
};

export type ContentItem = {
  id: string;
  content_type: ContentType;
  status: ContentStatus;
  legal_status: LegalStatus | null;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  body_format: "markdown" | "html" | "plain_text";
  category_id: string | null;
  cover_image_url: string | null;
  seo_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  published_at: string | null;
  first_published_at: string | null;
  is_featured: boolean;
  sort_order: number;
  ai_searchable: boolean;
  noindex: boolean;
  source_type: string | null;
  source_name: string | null;
  source_url: string | null;
  source_published_at: string | null;
  source_updated_at: string | null;
  effective_from: string | null;
  effective_to: string | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  review_cycle_days: number | null;
  review_owner: string | null;
  version: number;
  supersedes_id: string | null;
  superseded_by_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  content_categories?: Pick<ContentCategory, "id" | "name" | "slug"> | null;
  content_item_tags?: ContentItemTag[] | null;
};

export const contentStatusLabels: Record<ContentStatus, string> = {
  draft: "草稿",
  published: "已發布",
  archived: "封存"
};

export const legalStatusLabels: Record<LegalStatus, string> = {
  current: "現行有效",
  outdated: "已過期",
  pending_review: "待複查",
  draft: "法規草稿",
  archived: "法規封存"
};

