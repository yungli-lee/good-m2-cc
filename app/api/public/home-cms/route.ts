import { NextResponse } from "next/server";
import { listActiveHomeCampaigns, listPublishedSitePages } from "@/lib/home-cms/queries";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { getAllPublicNavigationItems } from "@/lib/navigation";

export const runtime = "edge";

export async function GET() {
  const [campaigns, pages, company, navigation] = await Promise.all([
    listActiveHomeCampaigns(),
    listPublishedSitePages(),
    getPublicCompanySettings(),
    getAllPublicNavigationItems()
  ]);

  return NextResponse.json({
    campaigns,
    pages,
    company,
    navigation
  });
}
