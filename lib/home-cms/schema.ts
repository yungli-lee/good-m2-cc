import { z } from "zod";
const optionalText = (max = 4000) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalDate = z.string().trim().max(40).optional().or(z.literal(""));
export const cmsStatusValues = ["draft", "published", "archived"] as const;
export const sitePageTypeValues = ["philosophy", "services", "contact", "reminder", "custom"] as const;

export const homeCampaignSchema = z.object({
  title: z.string().trim().min(1).max(180),
  subtitle: optionalText(260),
  eyebrow: optionalText(120),
  body: optionalText(1000),
  image_media_id: z.string().trim().uuid().optional().or(z.literal("")),
  fallback_image_url: optionalText(800),
  image_alt: optionalText(200),
  cta_label: optionalText(80),
  cta_href: optionalText(800),
  secondary_cta_label: optionalText(80),
  secondary_cta_href: optionalText(800),
  status: z.enum(cmsStatusValues).default("draft"),
  sort_order: z.coerce.number().int().min(0).default(1000),
  starts_at: optionalDate,
  ends_at: optionalDate
});

export const sitePageSchema = z.object({
  page_type: z.enum(sitePageTypeValues),
  page_key: z.string().trim().min(1).max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug 僅能使用小寫英文字母、數字與連字號，且連字號不可位於開頭、結尾或連續使用。"),
  title: z.string().trim().min(1).max(180),
  eyebrow: optionalText(120),
  subtitle: optionalText(260),
  markdown_content: optionalText(20000),
  cover_media_id: z.string().trim().uuid().optional().or(z.literal("")),
  fallback_cover_url: optionalText(800),
  seo_title: optionalText(180),
  seo_description: optionalText(300),
  status: z.enum(cmsStatusValues).default("draft"),
  sort_order: z.coerce.number().int().min(0).default(1000)
});

export type HomeCampaignInput = z.infer<typeof homeCampaignSchema>;
export type SitePageInput = z.infer<typeof sitePageSchema>;

export function nullable(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function valuesFromFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
