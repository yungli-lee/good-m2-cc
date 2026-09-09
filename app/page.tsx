import type { Metadata } from "next";
import { HomeRenderer } from "@/components/home/home-renderer";
import { defaultCompanySettings, getPublicCompanySettings } from "@/lib/company-settings";
import { listActiveHomeCampaigns, listHomepageSitePages } from "@/lib/home-cms/queries";
import { getFeaturedPublishedProperties, getLatestPublishedProperties } from "@/lib/properties/queries";
import { listPublicKnowledgeItems } from "@/lib/content/queries";
import { getAllPublicNavigationItems } from "@/lib/navigation";
import { defaultSiteDisplaySettings, getSiteDisplaySettings } from "@/lib/site-display-settings";
import { resolveHomeSocialImage } from "@/lib/home-social-metadata";
import { getCachedHomeSocialImageUrl } from "@/lib/home-social-settings";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const homeTitle = "阿勇不動產顧問｜彰化房地產資訊與服務";
const homeDescription = "提供彰化地區房屋、土地、農地與廠房資訊，專業、用心、誠信協助您安心買賣。";
const homeUrl = "https://good.m2.cc/";

export async function generateMetadata(): Promise<Metadata> {
  const homeSocialImage = await resolveHomeSocialImage({ load: getCachedHomeSocialImageUrl });
  return {
    title: homeTitle,
    applicationName: "阿勇不動產顧問",
    description: homeDescription,
    alternates: { canonical: homeUrl },
    openGraph: {
      title: homeTitle,
      description: homeDescription,
      url: homeUrl,
      type: "website",
      locale: "zh_TW",
      siteName: "阿勇不動產顧問",
      images: [{
        url: homeSocialImage,
        width: 1200,
        height: 630,
        alt: homeTitle
      }]
    },
    twitter: {
      card: "summary_large_image",
      title: homeTitle,
      description: homeDescription,
      images: [homeSocialImage]
    }
  };
}

export default async function HomePage() {
  const settings = await getSiteDisplaySettings().catch(() => defaultSiteDisplaySettings);
  const [campaignResult, pageResult, companyResult, navigationResult, featuredResult, latestResult, knowledgeResult] = await Promise.allSettled([
    listActiveHomeCampaigns(),
    listHomepageSitePages(),
    getPublicCompanySettings(),
    getAllPublicNavigationItems(),
    getFeaturedPublishedProperties(settings.featured_property_limit),
    getLatestPublishedProperties(settings.latest_property_limit),
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
      <HomeRenderer campaigns={campaigns} pages={pages} company={company} navigation={navigation} featuredProperties={featuredProperties} latestProperties={latestProperties} knowledge={knowledge} displaySettings={settings} />
    </>
  );
}
