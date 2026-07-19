import { NextResponse } from "next/server";
import { listActiveHomeCampaigns, listPublishedSitePages } from "@/lib/home-cms/queries";

export const runtime = "edge";

export async function GET() {
  const [campaigns, pages] = await Promise.all([
    listActiveHomeCampaigns(),
    listPublishedSitePages()
  ]);

  return NextResponse.json({
    campaigns,
    pages
  });
}
