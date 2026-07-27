export const reservedSitePageSlugs = [
  "admin",
  "api",
  "calculator",
  "contact",
  "knowledge",
  "properties",
  "robots.txt",
  "sitemap.xml",
  "_next"
] as const;

const reservedSlugSet = new Set<string>(reservedSitePageSlugs);

export function isReservedSitePageSlug(slug: string) {
  return reservedSlugSet.has(slug.trim().toLowerCase());
}

export function publicSitePagePath(slug: string) {
  return `/${slug.trim().toLowerCase()}`;
}

export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return configured || "https://good.m2.cc";
}
