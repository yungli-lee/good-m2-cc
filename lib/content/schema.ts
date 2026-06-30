import { z } from "zod";
import type { AdminRole } from "@/lib/auth";
import type { ContentItem, LegalStatus } from "@/lib/content/types";

const optionalText = (max = 1000) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalDateTime = z.string().trim().max(40).optional().or(z.literal(""));

export const legalStatusValues = ["current", "outdated", "pending_review", "draft", "archived"] as const;

export const knowledgeFormSchema = z.object({
  title: z.string().trim().min(1, "請輸入標題。").max(180, "標題太長。"),
  slug: z.string().trim().max(140).regex(/^[a-z0-9-]*$/, "Slug 僅能使用小寫英文、數字與連字號。").optional().or(z.literal("")),
  category_id: z.string().trim().uuid().optional().or(z.literal("")),
  tags: optionalText(1000),
  summary: optionalText(800),
  body: optionalText(50000),
  seo_title: optionalText(180),
  meta_description: optionalText(300),
  legal_status: z.enum(legalStatusValues).optional().or(z.literal("")),
  source_name: optionalText(200),
  source_url: optionalText(800),
  effective_from: optionalDateTime,
  effective_to: optionalDateTime,
  last_reviewed_at: optionalDateTime,
  next_review_at: optionalDateTime,
  review_cycle_days: z.coerce.number().int().positive().optional().or(z.literal("")),
  sort_order: z.coerce.number().int().default(1000)
});

export type KnowledgeFormInput = z.infer<typeof knowledgeFormSchema>;

export function valuesFromFormData(formData: FormData) {
  return {
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || ""),
    category_id: String(formData.get("category_id") || ""),
    tags: String(formData.get("tags") || ""),
    summary: String(formData.get("summary") || ""),
    body: String(formData.get("body") || ""),
    seo_title: String(formData.get("seo_title") || ""),
    meta_description: String(formData.get("meta_description") || ""),
    legal_status: String(formData.get("legal_status") || ""),
    source_name: String(formData.get("source_name") || ""),
    source_url: String(formData.get("source_url") || ""),
    effective_from: String(formData.get("effective_from") || ""),
    effective_to: String(formData.get("effective_to") || ""),
    last_reviewed_at: String(formData.get("last_reviewed_at") || ""),
    next_review_at: String(formData.get("next_review_at") || ""),
    review_cycle_days: String(formData.get("review_cycle_days") || ""),
    sort_order: String(formData.get("sort_order") || "1000")
  };
}

export function toSafeSlug(value: string, fallback = "knowledge") {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);

  return slug || `${fallback}-${crypto.randomUUID().slice(0, 8)}`;
}

function nullable(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function splitTagNames(value?: string | null) {
  return Array.from(new Set(
    String(value || "")
      .split(/[,，、\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20)
  ));
}

export function itemTagText(item?: ContentItem | null) {
  return (item?.content_item_tags || [])
    .map((relation) => relation.content_tags?.name)
    .filter(Boolean)
    .join(", ");
}

export function toKnowledgePayload(input: KnowledgeFormInput, role: AdminRole, userId: string, existing?: ContentItem | null) {
  const generatedSlug = toSafeSlug(input.slug || input.title);
  const legalStatus = nullable(input.legal_status) as LegalStatus | null;

  return {
    content_type: "knowledge",
    title: input.title,
    slug: generatedSlug,
    category_id: nullable(input.category_id),
    summary: nullable(input.summary),
    body: nullable(input.body),
    body_format: "markdown",
    seo_title: nullable(input.seo_title),
    meta_description: nullable(input.meta_description),
    canonical_url: `/knowledge/${generatedSlug}`,
    legal_status: role === "editor" && legalStatus === "current" ? "pending_review" : legalStatus,
    source_name: nullable(input.source_name),
    source_url: nullable(input.source_url),
    effective_from: nullable(input.effective_from),
    effective_to: nullable(input.effective_to),
    last_reviewed_at: nullable(input.last_reviewed_at),
    next_review_at: nullable(input.next_review_at),
    review_cycle_days: nullable(input.review_cycle_days),
    sort_order: input.sort_order || 1000,
    ai_searchable: role === "editor" ? false : existing?.ai_searchable || false,
    noindex: existing?.noindex || false,
    is_featured: existing?.is_featured || false,
    updated_by: userId
  };
}
