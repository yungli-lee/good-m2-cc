import { formatPing, formatPrice, propertyTypeLabel } from "@/lib/format";
import type { Property } from "./types";
import { getCoverMedia, getMediaImageUrl } from "./types";

import { defaultCompanySettings } from "../company-settings-core";
import { siteOrigin } from "../home-cms/routing";
const cityPattern = /(?<city>[^縣市]+[縣市])(?<district>[^鄉鎮市區]+[鄉鎮市區])?/;

type SeoProperty = Partial<Pick<
  Property,
  | "title"
  | "slug"
  | "address_public"
  | "price"
  | "land_area_ping"
  | "building_area_ping"
  | "layout"
  | "property_type"
  | "highlights"
  | "description"
  | "seo_title"
  | "meta_description"
  | "property_media"
  | "og_image_url"
>>;

function compactText(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join("｜");
}

export function propertyRegion(value?: string | null) {
  const match = value?.match(cityPattern);
  return match?.groups?.district || match?.groups?.city || value?.trim() || "";
}

export function propertyCanonicalUrl(slug?: string | null) {
  const cleanSlug = slug?.trim();
  return cleanSlug ? `${siteOrigin()}/properties/${cleanSlug}` : `${siteOrigin()}/properties`;
}

export function generatePropertySeoTitle(property: SeoProperty, siteName = defaultCompanySettings.brand_name) {
  const title = property.title?.trim() || "精選物件";
  const region = propertyRegion(property.address_public);
  const feature = property.highlights?.find((item) => item?.trim())?.trim()
    || (property.property_type ? propertyTypeLabel(property.property_type) : "")
    || property.layout
    || "";
  return compactText([title, region, feature, siteName]).slice(0, 180);
}

export function generatePropertyMetaDescription(property: SeoProperty, siteName = defaultCompanySettings.brand_name) {
  const title = property.title?.trim() || "精選物件";
  const highlights = (property.highlights || []).filter(Boolean).slice(0, 2).join("、");
  const base = compactText([
    title,
    property.address_public || propertyRegion(property.address_public),
    property.price == null ? "" : `開價${formatPrice(property.price)}`,
    property.layout ? `格局${property.layout}` : "",
    property.land_area_ping == null ? "" : `土地${formatPing(property.land_area_ping)}`,
    property.building_area_ping == null ? "" : `建物${formatPing(property.building_area_ping)}`,
    highlights
  ]);
  const fallback = `${base}。由${siteName}整理物件資訊，歡迎預約諮詢、了解屋況與交易細節。`;
  const description = property.description?.trim() || fallback;
  const normalized = description.replace(/\s+/g, " ").slice(0, 150);
  return normalized.length >= 80 ? normalized : fallback.slice(0, 150);
}

export function resolvePropertySeo(property: SeoProperty, siteName = defaultCompanySettings.brand_name) {
  const cover = getCoverMedia({ property_media: property.property_media || [] });
  return {
    title: property.seo_title?.trim() || generatePropertySeoTitle(property, siteName),
    description: property.meta_description?.trim() || generatePropertyMetaDescription(property, siteName),
    ogTitle: property.seo_title?.trim() || generatePropertySeoTitle(property, siteName),
    ogDescription: property.meta_description?.trim() || generatePropertyMetaDescription(property, siteName),
    ogImage: property.og_image_url?.trim() || getMediaImageUrl(cover) || undefined,
    canonical: propertyCanonicalUrl(property.slug)
  };
}
