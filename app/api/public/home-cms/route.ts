import { NextResponse } from "next/server";
import { listActiveHomeCampaigns, listPublishedSitePages } from "@/lib/home-cms/queries";
import { getPublicCompanySettings } from "@/lib/company-settings";

export const runtime = "edge";

export async function GET() {
  const [campaigns, pages, company] = await Promise.all([
    listActiveHomeCampaigns(),
    listPublishedSitePages(),
    getPublicCompanySettings()
  ]);

  return NextResponse.json({
    campaigns,
    pages,
    company
  });
}
