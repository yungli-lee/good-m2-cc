import { resolveHomeSocialImage } from "@/lib/home-social-metadata";
import { getCachedHomeSocialImageUrl } from "@/lib/home-social-settings";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { propertyCollectionCoverUrl } from "./core";
export function getCollectionCover(path = "") {
  return propertyCollectionCoverUrl(path, getSupabaseEnv().url);
}
export async function getCollectionSocialImage(path = "") {
  return getCollectionCover(path) || resolveHomeSocialImage({ load: getCachedHomeSocialImageUrl, supabaseOrigin: getSupabaseEnv().url });
}
