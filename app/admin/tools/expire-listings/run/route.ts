import { NextRequest, NextResponse } from "next/server";
import { canPublishProperties, getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { expireListingsSummaryParam, expiredListingTimelineContent, selectExpiredPublishedListings, todayDateString } from "@/lib/properties/expire-listings";
import { insertPropertyTimelineEvent } from "@/lib/properties/timeline";

export const runtime = "edge";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  const current = await getCurrentProfile();
  if (!current) return redirectTo(request, "/admin/login");
  if (!canPublishProperties(current.profile.role)) return redirectTo(request, "/admin/login?error=forbidden");

  const supabase = await createSupabaseServerClient();
  const today = todayDateString();
  const { data, error } = await supabase
    .from("properties")
    .select("id,title,slug,status,listing_end_date")
    .eq("status", "published")
    .not("listing_end_date", "is", null)
    .lt("listing_end_date", today)
    .is("deleted_at", null);

  if (error) {
    console.error("expire_listings_query_failed", { code: error.code, message: error.message?.slice(0, 180) });
    return redirectTo(request, "/admin/tools/expire-listings?error=query_failed");
  }

  const expired = selectExpiredPublishedListings(data || [], today);
  const results = [];

  for (const property of expired) {
    const { error: updateError } = await supabase
      .from("properties")
      .update({
        status: "draft",
        published_at: null,
        updated_by: current.user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", property.id)
      .eq("status", "published");

    if (updateError) {
      console.error("expire_listing_update_failed", { code: updateError.code, message: updateError.message?.slice(0, 180), propertyId: property.id });
      continue;
    }

    results.push({
      id: property.id,
      title: property.title,
      listing_end_date: property.listing_end_date || ""
    });

    await insertPropertyTimelineEvent(supabase, {
      property_id: property.id,
      event_date: today,
      event_type: "unpublished",
      title: "委託到期自動下架",
      content: expiredListingTimelineContent(property.listing_end_date || today),
      created_by: current.user.id,
      created_by_email: current.user.email || current.profile.email || null
    });
  }

  return redirectTo(request, `/admin/tools/expire-listings?count=${results.length}&items=${expireListingsSummaryParam(results)}`);
}
