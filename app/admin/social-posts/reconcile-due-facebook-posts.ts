import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FACEBOOK_PAGE_ID, resolveFacebookPageToken } from "./facebook-page-token";

/**
 * Opportunistic reconciliation: when an authorized user opens the admin list,
 * verify a small batch of due scheduled posts against Meta.
 *
 * This is NOT a background cron. Never infer deletion from a Graph error,
 * and never re-submit a post to Facebook from this path.
 */
export async function reconcileDueFacebookPosts(
  db: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  authorId: string
): Promise<void> {
  if (process.env.FACEBOOK_PUBLISH_ENABLED !== "true" || !process.env.FACEBOOK_PAGE_ACCESS_TOKEN) return;

  const now = new Date();
  const { data: due, error } = await db.from("social_posts")
    .select("id,facebook_post_id,facebook_scheduled_for,facebook_page_id")
    .eq("author_id", authorId)
    .eq("status", "scheduled")
    .eq("facebook_page_id", FACEBOOK_PAGE_ID)
    .is("facebook_deleted_at", null)
    .not("facebook_post_id", "is", null)
    .lte("facebook_scheduled_for", now.toISOString())
    .order("facebook_scheduled_for", { ascending: false })
    .limit(3);
  if (error || !due?.length) return;

  let token: string;
  try {
    token = await resolveFacebookPageToken();
  } catch {
    // Authentication errors must not mutate or hide scheduled records.
    return;
  }

  await Promise.all(due.map(async post => {
    if (!post.facebook_post_id || !post.facebook_post_id.startsWith(FACEBOOK_PAGE_ID + "_")) return;
    try {
      const response = await fetch(
        "https://graph.facebook.com/v26.0/" +
          encodeURIComponent(post.facebook_post_id) + "?fields=id,is_published",
        {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
          signal: AbortSignal.timeout(5000)
        }
      );
      if (!response.ok) return;
      const data = await response.json() as {
        id?: string;
        is_published?: boolean;
        error?: { code?: number };
      };
      // Only a positive, matching Graph confirmation can advance the status.
      if (data.error || data.id !== post.facebook_post_id || data.is_published !== true) return;
      await db.from("social_posts").update({
        status: "posted",
        facebook_published_at: post.facebook_scheduled_for || now.toISOString(),
        updated_at: new Date().toISOString()
      })
        .eq("id", post.id)
        .eq("author_id", authorId)
        .eq("status", "scheduled")
        .eq("facebook_post_id", post.facebook_post_id)
        .is("facebook_deleted_at", null);
    } catch {
      // A timeout or API error is unknown, never evidence of deletion.
    }
  }));
}
