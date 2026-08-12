import { z } from "zod";

export const defaultSiteDisplaySettings = {
  featured_property_limit: 12,
  featured_property_autoplay: true,
  featured_property_interval_seconds: 5,
  latest_property_limit: 12,
  latest_property_autoplay: true,
  latest_property_interval_seconds: 6,
  knowledge_page_size: 6
};

export type SiteDisplaySettings = typeof defaultSiteDisplaySettings;

export const siteDisplaySettingsSchema = z.object({
  featured_property_limit: z.coerce.number().int().min(3).max(24),
  featured_property_autoplay: z.boolean(),
  featured_property_interval_seconds: z.coerce.number().int().min(3).max(30),
  latest_property_limit: z.coerce.number().int().min(3).max(24),
  latest_property_autoplay: z.boolean(),
  latest_property_interval_seconds: z.coerce.number().int().min(3).max(30),
  knowledge_page_size: z.coerce.number().int().refine((value) => [6, 9, 12].includes(value), "每頁篇數只能是 6、9 或 12")
});

export function siteDisplaySettingsFromFormData(formData: FormData) {
  return {
    featured_property_limit: formData.get("featured_property_limit"),
    featured_property_autoplay: formData.get("featured_property_autoplay") === "on",
    featured_property_interval_seconds: formData.get("featured_property_interval_seconds"),
    latest_property_limit: formData.get("latest_property_limit"),
    latest_property_autoplay: formData.get("latest_property_autoplay") === "on",
    latest_property_interval_seconds: formData.get("latest_property_interval_seconds"),
    knowledge_page_size: formData.get("knowledge_page_size")
  };
}

export function normalizeSiteDisplaySettings(data?: Partial<SiteDisplaySettings> | null): SiteDisplaySettings {
  const parsed = siteDisplaySettingsSchema.safeParse({ ...defaultSiteDisplaySettings, ...data });
  return parsed.success ? parsed.data : defaultSiteDisplaySettings;
}
