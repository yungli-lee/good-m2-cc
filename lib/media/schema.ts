import { z } from "zod";
import { mediaStatuses, mediaUsageTypes } from "@/lib/media/constants";

export const mediaUsageTypeSchema = z.enum(mediaUsageTypes);
export const mediaStatusSchema = z.enum(mediaStatuses);

export const mediaCategoryValues = ["all", "knowledge", "property", "company", "hero", "general"] as const;
export const mediaSortValues = ["newest", "oldest", "name"] as const;

export type MediaCategoryFilter = (typeof mediaCategoryValues)[number];
export type MediaSort = (typeof mediaSortValues)[number];

export const mediaCategoryUsageTypes: Record<Exclude<MediaCategoryFilter, "all">, Array<(typeof mediaUsageTypes)[number]>> = {
  knowledge: ["knowledge_hero", "knowledge_inline", "knowledge_gallery"],
  property: ["property_image", "property_cover", "property_floor_plan", "property_document_image"],
  company: ["company_logo", "company_line_qr"],
  hero: ["hero_banner"],
  general: ["general"]
};

export const mediaMetadataSchema = z.object({
  alt_text: z.string().trim().max(300).optional().or(z.literal("")),
  caption: z.string().trim().max(500).optional().or(z.literal("")),
  usage_type: mediaUsageTypeSchema
});

export function parseMediaCategory(value?: string | null): MediaCategoryFilter {
  return mediaCategoryValues.includes(value as MediaCategoryFilter) ? value as MediaCategoryFilter : "all";
}

export function parseMediaStatus(value?: string | null) {
  return mediaStatuses.includes(value as (typeof mediaStatuses)[number]) ? value as (typeof mediaStatuses)[number] : "active";
}

export function parseMediaSort(value?: string | null): MediaSort {
  return mediaSortValues.includes(value as MediaSort) ? value as MediaSort : "newest";
}
