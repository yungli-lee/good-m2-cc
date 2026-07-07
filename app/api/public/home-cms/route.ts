import { NextResponse } from "next/server";
import { listActiveHomeCampaigns, listPublishedSitePages } from "@/lib/home-cms/queries";

export const runtime = "edge";

export async function GET() {
  const [campaigns, pageMap] = await Promise.all([
    listActiveHomeCampaigns(),
    listPublishedSitePages()
  ]);

  return NextResponse.json({
    campaigns,
    pages: Array.from(pageMap.values())
  });
}
