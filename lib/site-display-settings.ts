import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultSiteDisplaySettings, normalizeSiteDisplaySettings, type SiteDisplaySettings } from "@/lib/site-display-settings-core";

export { defaultSiteDisplaySettings, siteDisplaySettingsFromFormData, siteDisplaySettingsSchema } from "@/lib/site-display-settings-core";
export type { SiteDisplaySettings } from "@/lib/site-display-settings-core";

export async function getSiteDisplaySettings(): Promise<SiteDisplaySettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("site_display_settings").select("featured_property_limit,featured_property_autoplay,featured_property_interval_seconds,latest_property_limit,latest_property_autoplay,latest_property_interval_seconds,knowledge_page_size").eq("id", "default").maybeSingle();
  if (error || !data) return defaultSiteDisplaySettings;
  return normalizeSiteDisplaySettings(data);
}
