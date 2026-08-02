import type { SupabaseClient } from "@supabase/supabase-js";
import { homepageVideoMaxFileSize } from "@/lib/media/constants";

export async function validateHomeCampaignMedia(supabase: SupabaseClient, mediaId?: string | null) {
  if (!mediaId) return { ok: true as const };
  const { data, error } = await supabase
    .from("media_assets")
    .select("id,media_type,mime_type,file_size,poster_url,poster_storage_path,status,deleted_at")
    .eq("id", mediaId)
    .maybeSingle();
  if (error || !data || data.status !== "active" || data.deleted_at) return { ok: false as const, error: "media_not_available" };
  if (data.media_type !== "video") return { ok: true as const };
  if (!data.poster_url || !data.poster_storage_path) return { ok: false as const, error: "video_poster_required" };
  if (!data.file_size || data.file_size > homepageVideoMaxFileSize) return { ok: false as const, error: "homepage_video_too_large" };
  if (data.mime_type !== "video/mp4" && data.mime_type !== "video/webm") return { ok: false as const, error: "unsupported_video" };
  return { ok: true as const };
}
