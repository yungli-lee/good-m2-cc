import type { Metadata } from "next";
import { HomeRenderer } from "@/components/home/home-renderer";
import { defaultCompanySettings, getPublicCompanySettings } from "@/lib/company-settings";
import { listActiveHomeCampaigns, listHomepageSitePages } from "@/lib/home-cms/queries";
import { getFeaturedPublishedProperties, getLatestPublishedProperties } from "@/lib/properties/queries";
import { listPublicKnowledgeItems } from "@/lib/content/queries";
import { getAllPublicNavigationItems } from "@/lib/navigation";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getPublicCompanySettings().catch(() => defaultCompanySettings);
  return {
    title: company.brand_name,
    applicationName: company.brand_name,
    description: "買屋、賣屋、貸款、稅務、簽約到交屋，每一步都清楚說明。",
    openGraph: {
      title: company.brand_name,
      siteName: company.brand_name,
      description: "買屋、賣屋、貸款、稅務、簽約到交屋，每一步都清楚說明。"
    }
  };
}

export default async function HomePage() {
  const [campaignResult, pageResult, companyResult, navigationResult, featuredResult, latestResult, knowledgeResult] = await Promise.allSettled([
    listActiveHomeCampaigns(),
    listHomepageSitePages(),
    getPublicCompanySettings(),
    getAllPublicNavigationItems(),
    getFeaturedPublishedProperties(12),
    getLatestPublishedProperties(12),
    listPublicKnowledgeItems(3)
  ]);
  const campaigns = campaignResult.status === "fulfilled" ? campaignResult.value : [];
  const pages = pageResult.status === "fulfilled" ? pageResult.value : [];
  const company = companyResult.status === "fulfilled" ? companyResult.value : defaultCompanySettings;
  const navigation = navigationResult.status === "fulfilled" ? navigationResult.value : [];
  const featuredProperties = featuredResult.status === "fulfilled" ? featuredResult.value.data || [] : [];
  const latestProperties = latestResult.status === "fulfilled" ? latestResult.value.data || [] : [];
  const knowledge = knowledgeResult.status === "fulfilled" ? knowledgeResult.value.data : [];
  for (const [source, result] of [["campaigns", campaignResult], ["pages", pageResult], ["company", companyResult], ["navigation", navigationResult]] as const) {
    if (result.status === "rejected") console.warn("home_cms_source_unavailable", { source });
  }

  return (
    <>
      <link rel="stylesheet" href="/legacy-static/styles.css" />
      <HomeRenderer campaigns={campaigns} pages={pages} company={company} navigation={navigation} featuredProperties={featuredProperties} latestProperties={latestProperties} knowledge={knowledge} />
    </>
  );
}
