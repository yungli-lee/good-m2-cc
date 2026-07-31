import assert from "node:assert/strict";
import { defaultCompanySettings, type CompanySettings } from "../lib/company-settings-core.ts";
import type { HomeCampaign } from "../lib/home-cms/types.ts";
const { buildHomepageViewModel } = await import("../lib/homepage/view-model.ts");
const company: CompanySettings = { ...defaultCompanySettings, brand_name: "品牌", brand_tagline: "副標", line_url: "https://example.com", brand_logo_url: "/logo.png" };
const campaign = (id: string, title: string, sort_order: number): HomeCampaign => ({
  id, title, sort_order, status: "published", archived_at: null, subtitle: null, eyebrow: null, body: null,
  image_media_id: null, fallback_image_url: null, image_alt: null, cta_label: null, cta_href: null,
  secondary_cta_label: null, secondary_cta_href: null, starts_at: null, ends_at: null, created_by: null,
  updated_by: null, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z"
});
const model = buildHomepageViewModel({ company, navigation: [], campaigns: [campaign("2", "後", 2), campaign("1", "前", 1)], pages: [] });
assert.deepEqual(model.sections.map((section)=>section.title),["前","後"]);
assert.equal(model.sections.filter((section)=>section.enabled).length,2);
assert.equal(model.seo.title,"品牌");
console.log("homepage renderer tests passed");
