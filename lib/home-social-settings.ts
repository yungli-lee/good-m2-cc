import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

const loadHomeSocialImageUrl = unstable_cache(async () => {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return null;
  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.from("site_display_settings").select("home_social_image_url,home_social_image_path").eq("id", "default").maybeSingle();
  if (error || !data?.home_social_image_path) return null;
  return { url: data.home_social_image_url, path: data.home_social_image_path };
}, ["home-social-image"], { revalidate: 300, tags: ["home-social-image"] });

export function getCachedHomeSocialImageUrl() {
  return loadHomeSocialImageUrl();
}
