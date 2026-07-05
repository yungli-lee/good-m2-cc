import { NextRequest, NextResponse } from "next/server";
import { canPublishProperties, getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { expireListingsSummaryParam } from "@/lib/properties/expire-listings";

export const runtime = "edge";

type ExpireListingsRpcResult = {
  property_id: string;
  title: string;
  listing_end_date: string | null;
  expired_at: string | null;
};

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  const current = await getCurrentProfile();
  if (!current) return redirectTo(request, "/admin/login");
  if (!canPublishProperties(current.profile.role)) return redirectTo(request, "/admin/login?error=forbidden");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("expire_published_listings", {
    p_source: "manual",
    p_actor_user_id: current.user.id,
    p_actor_email: current.user.email || current.profile.email || null,
    p_actor_role: current.profile.role
  });
  if (error) {
    console.error("expire_listings_rpc_failed", { code: error.code, message: error.message?.slice(0, 180) });
    return redirectTo(request, "/admin/tools/expire-listings?error=expire_failed");
  }

  const results = ((data || []) as ExpireListingsRpcResult[]).map((property) => ({
    id: property.property_id,
    title: property.title,
    listing_end_date: property.listing_end_date || "",
    expired_at: property.expired_at || ""
  }));

  return redirectTo(request, `/admin/tools/expire-listings?count=${results.length}&items=${expireListingsSummaryParam(results)}`);
}
