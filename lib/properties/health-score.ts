import type { Property, PropertyMedia } from "@/lib/properties/types";

export type PropertyHealthLevel = "good" | "attention" | "weak";

export type PropertyHealthCheck = {
  key: string;
  label: string;
  points: number;
  passed: boolean;
};

export type PropertyHealthScore = {
  score: number;
  level: PropertyHealthLevel;
  label: string;
  checks: PropertyHealthCheck[];
  missing: PropertyHealthCheck[];
};

type HealthScoreProperty = Partial<
  Pick<
    Property,
    | "title"
    | "slug"
    | "address_public"
    | "address_private"
    | "listing_no"
    | "listing_type"
    | "listing_start_date"
    | "listing_end_date"
    | "owner_name"
    | "owner_phone"
    | "developer_names"
    | "showing_instructions"
    | "price"
    | "land_area_ping"
    | "building_area_ping"
    | "layout"
    | "age"
    | "orientation"
    | "floor"
    | "property_type"
    | "highlights"
    | "description"
    | "seo_title"
    | "meta_description"
    | "og_image_url"
    | "canonical_url"
    | "property_media"
  >
> & {
  property_media?: Partial<PropertyMedia>[] | null;
};

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function hasNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasHighlights(value?: string[] | null) {
  return Boolean(value?.some((item) => item.trim()));
}

function hasActiveMedia(value?: Partial<PropertyMedia>[] | null) {
  return Boolean(value?.some((item) => !item.deleted_at && item.url));
}

function hasCoverMedia(value?: Partial<PropertyMedia>[] | null) {
  return Boolean(value?.some((item) => !item.deleted_at && item.url && item.is_cover));
}

export function calculatePropertyHealthScore(property: HealthScoreProperty): PropertyHealthScore {
  const checks: PropertyHealthCheck[] = [
    { key: "title", label: "案名", points: 8, passed: hasText(property.title) },
    { key: "slug", label: "Slug", points: 5, passed: hasText(property.slug) },
    { key: "address_public", label: "公開地址", points: 8, passed: hasText(property.address_public) },
    { key: "price", label: "開價", points: 8, passed: hasNumber(property.price) },
    { key: "area", label: "坪數", points: 8, passed: hasNumber(property.land_area_ping) || hasNumber(property.building_area_ping) },
    { key: "property_type", label: "物件類型", points: 5, passed: hasText(property.property_type) && property.property_type !== "other" },
    { key: "layout", label: "格局或樓層", points: 6, passed: hasText(property.layout) || hasText(property.floor) },
    { key: "detail", label: "屋齡或座向", points: 6, passed: hasNumber(property.age) || hasText(property.orientation) },
    { key: "highlights", label: "物件特色", points: 8, passed: hasHighlights(property.highlights) },
    { key: "description", label: "詳細介紹", points: 10, passed: hasText(property.description) },
    { key: "media", label: "物件照片", points: 8, passed: hasActiveMedia(property.property_media) },
    { key: "cover", label: "封面照片", points: 5, passed: hasCoverMedia(property.property_media) },
    { key: "listing", label: "委託資料", points: 6, passed: hasText(property.listing_no) && hasText(property.listing_type) },
    { key: "owner", label: "屋主聯絡資訊", points: 5, passed: hasText(property.owner_name) && hasText(property.owner_phone) },
    { key: "developer", label: "開發人員", points: 4, passed: hasText(property.developer_names) },
    {
      key: "seo",
      label: "SEO 摘要",
      points: 5,
      passed: hasText(property.seo_title) && hasText(property.meta_description)
    }
  ];

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.points : 0), 0);
  const level: PropertyHealthLevel = score >= 80 ? "good" : score >= 55 ? "attention" : "weak";
  const label = level === "good" ? "健康" : level === "attention" ? "待補" : "需整理";

  return {
    score,
    level,
    label,
    checks,
    missing: checks.filter((check) => !check.passed)
  };
}
