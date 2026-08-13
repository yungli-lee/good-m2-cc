import type { MetadataRoute } from "next";
import { listPublicKnowledgeItems } from "@/lib/content/queries";
import { listPublicPageSitePages } from "@/lib/home-cms/queries";
import { isReservedSitePageSlug, siteOrigin } from "@/lib/home-cms/routing";
import { listPublishedProperties } from "@/lib/properties/queries";
import { listPublicAreaPages } from "@/lib/areas-cms";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const [propertyResult, knowledgeResult, sitePages, areaPages] = await Promise.all([
    listPublishedProperties(),
    listPublicKnowledgeItems({ page: 1, pageSize: 1000 }),
    listPublicPageSitePages(),
    listPublicAreaPages()
  ]);

  const properties = (propertyResult.data || []).map((property) => ({
    url: `${origin}/properties/${property.slug}`,
    lastModified: property.updated_at || property.published_at || undefined
  }));
  const knowledge = knowledgeResult.data.map((item) => ({
    url: `${origin}/knowledge/${item.slug}`,
    lastModified: item.updated_at || item.published_at || undefined
  }));
  const pages = sitePages
    .filter((page) => !isReservedSitePageSlug(page.page_key))
    .map((page) => ({
      url: `${origin}/${page.page_key}`,
      lastModified: page.updated_at || page.published_at || undefined
    }));
  const contact = sitePages.some((page) => page.page_type === "contact")
    ? [{ url: `${origin}/contact` }]
    : [];

  return [
    { url: origin },
    { url: `${origin}/properties` },
    { url: `${origin}/knowledge` },
    { url: `${origin}/areas` },
    ...areaPages.map((area) => ({ url: `${origin}/areas/${area.slug}` })),
    { url: `${origin}/calculator` },
    ...contact,
    ...properties,
    ...knowledge,
    ...pages
  ];
}
