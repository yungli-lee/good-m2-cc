import assert from "node:assert/strict";
import type { CompanySettings } from "../lib/company-settings.ts";
import type { SitePage } from "../lib/home-cms/types.ts";

const { isReservedSitePageSlug, publicSitePagePath } = await import("../lib/home-cms/routing.ts");
const { markdownToHtml, renderHomeCmsHtml } = await import("../lib/home-cms/render.ts");

for (const slug of ["properties", "knowledge", "calculator", "contact", "admin", "api"]) {
  assert.equal(isReservedSitePageSlug(slug), true);
}
assert.equal(isReservedSitePageSlug("my-custom-page"), false);
assert.equal(publicSitePagePath("my-custom-page"), "/my-custom-page");

const basePage: SitePage = {
  id: "00000000-0000-0000-0000-000000000001",
  page_key: "my-custom-page",
  page_type: "custom",
  title: "Custom page must stay independent",
  eyebrow: null,
  subtitle: null,
  markdown_content: "Body",
  cover_media_id: null,
  fallback_cover_url: null,
  seo_title: null,
  seo_description: null,
  status: "published",
  sort_order: 1,
  created_by: null,
  updated_by: null,
  created_at: "2026-07-23T00:00:00.000Z",
  updated_at: "2026-07-23T00:00:00.000Z",
  published_at: "2026-07-23T00:00:00.000Z",
  archived_at: null
};

const warnings: unknown[][] = [];
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => warnings.push(args);
const independentHtml = renderHomeCmsHtml("<main><p>home</p></main>", [], [basePage]);
console.warn = originalWarn;
assert.equal(independentHtml.includes(basePage.title), false);
assert.equal(warnings.length, 1);

const reminderOne = { ...basePage, id: "1", page_key: "reminder-one", page_type: "reminder" as const, title: "提醒一", sort_order: 1 };
const reminderTwo = { ...basePage, id: "2", page_key: "reminder-two", page_type: "reminder" as const, title: "提醒二", sort_order: 2 };
const reminderHtml = renderHomeCmsHtml('<main><section id="reminders">fallback</section></main>', [], [reminderOne, reminderTwo]);
assert.equal(reminderHtml.indexOf("提醒一") < reminderHtml.indexOf("提醒二"), true);
assert.equal(reminderHtml.includes('href="/reminder-one"'), true);

const company: CompanySettings = {
  brand_name: "測試品牌",
  brand_tagline: "測試副標",
  company_name: "測試公司",
  franchise_name: "測試加盟店",
  brokerage_license_no: "測試字號",
  realtor_certificate_no: "測試證號",
  salesperson_registration_no: "",
  company_phone: "0400000000",
  company_address: "測試地址",
  company_email: "cms@example.com",
  google_maps_url: "",
  facebook_url: "https://example.com/facebook",
  instagram_url: "",
  youtube_url: "https://example.com/youtube",
  tiktok_url: "https://example.com/tiktok",
  line_url: "https://example.com/line",
  logo_url: "https://example.com/logo.png",
  brand_logo_url: "https://example.com/brand-logo.png",
  franchise_logo_url: "https://example.com/franchise-logo.png",
  line_qr_code_url: "",
  copyright_text: "測試版權"
};
const companyHtml = renderHomeCmsHtml(
  '<header><a class="brand" href="/"><img alt="勇美標誌"><span><strong>舊品牌</strong><small>舊副標</small></span></a></header><main><a href="https://line.me/ti/p/abQv5LYzzE">LINE</a><a href="tel:0938137177">Phone</a><a href="mailto:best@m2.cc">Mail</a></main><footer><div class="site-footer"></div></footer>',
  [],
  [],
  company
);
assert.equal(companyHtml.includes(company.line_url), true);
assert.equal(companyHtml.includes("tel:0400000000"), true);
assert.equal(companyHtml.includes("mailto:cms@example.com"), true);
assert.equal(companyHtml.includes("<strong>測試品牌</strong>"), true);
assert.equal(companyHtml.includes("<small>測試副標</small>"), true);
assert.equal(companyHtml.includes("測試品牌・測試加盟店"), true);
assert.equal(companyHtml.includes("<small>測試公司</small>"), true);

assert.equal(markdownToHtml("<script>alert(1)</script>").includes("<script>"), false);

console.log("CMS Phase 1 tests passed");
