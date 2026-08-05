import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { SitePage } from "../lib/home-cms/types.ts";
import { markdownToHtml } from "../lib/home-cms/markdown.ts";
import { resolveManagedHomeSection, shouldRenderHomeSection, sortHomeSections } from "../lib/home-cms/registry.ts";
import { isReservedSitePageSlug, publicSitePagePath } from "../lib/home-cms/routing.ts";

for (const slug of ["properties", "knowledge", "calculator", "contact", "admin", "api"]) assert.equal(isReservedSitePageSlug(slug), true);
assert.equal(isReservedSitePageSlug("my-custom-page"), false);
assert.equal(publicSitePagePath("my-custom-page"), "/my-custom-page");

const basePage: SitePage = {
  id: "00000000-0000-0000-0000-000000000001", page_key: "philosophy", page_type: "philosophy", title: "CMS title",
  eyebrow: null, subtitle: null, markdown_content: "Body", cover_media_id: null, fallback_cover_url: null,
  seo_title: null, seo_description: null, status: "published", sort_order: 20, created_by: null, updated_by: null,
  created_at: "2026-07-23T00:00:00.000Z", updated_at: "2026-07-23T00:00:00.000Z", published_at: "2026-07-23T00:00:00.000Z", archived_at: null
};

assert.equal(resolveManagedHomeSection(basePage)?.key, "philosophy");
assert.equal(resolveManagedHomeSection({ ...basePage, status: "draft" }), null, "hidden/unpublished sections do not render");
assert.equal(resolveManagedHomeSection({ ...basePage, archived_at: "2026-08-03T00:00:00.000Z" }), null);
const warnings: unknown[][] = [];
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => warnings.push(args);
assert.equal(resolveManagedHomeSection({ ...basePage, page_key: "future-section", page_type: "custom" }), null);
console.warn = originalWarn;
assert.equal(warnings.length, 1, "unknown types have a safe warning and no crash");

const noPublishedSections = new Set<string>();
assert.equal(shouldRenderHomeSection("philosophy", noPublishedSections, 0), false, "archived/missing CMS section stays hidden");
assert.equal(shouldRenderHomeSection("reminders", noPublishedSections, 0), false, "reminders never fall back to hardcoded content");
assert.equal(shouldRenderHomeSection("buying-advice", noPublishedSections, 0), false, "uncontrolled static sections are removed");
assert.equal(shouldRenderHomeSection("hero", noPublishedSections, 0), false, "homepage hero requires a published campaign");
assert.equal(shouldRenderHomeSection("hero", noPublishedSections, 1), true);
assert.equal(shouldRenderHomeSection("featured-properties", noPublishedSections, 0), true, "published property API controls discovery sections");
assert.equal(shouldRenderHomeSection("philosophy", new Set(["philosophy"]), 0), true);
assert.equal(shouldRenderHomeSection("contact", new Set(["team"]), 0), true);
assert.equal(shouldRenderHomeSection("service-form", new Set(["team"]), 0), true);

const ordered = sortHomeSections([
  { stableKey: "z", sortOrder: 10 },
  { stableKey: "b", sortOrder: 5 },
  { stableKey: "a", sortOrder: 10 }
]);
assert.deepEqual(ordered.map((item) => item.stableKey), ["b", "a", "z"], "sort ties are deterministic");
assert.equal(markdownToHtml("<script>alert(1)</script>").includes("<script>"), false);

const pageSource = readFileSync("app/page.tsx", "utf8");
const rendererSource = readFileSync("components/home/home-renderer.tsx", "utf8");
const headerSource = readFileSync("components/home/home-header.tsx", "utf8");
const footerSource = readFileSync("components/home/home-footer.tsx", "utf8");
const contactSource = readFileSync("app/(public)/contact/page.tsx", "utf8");
const sitemapSource = readFileSync("app/sitemap.ts", "utf8");
assert.doesNotMatch(pageSource, /home-body\.html|HomeCmsClient|\/api\/public\/home-cms/);
assert.match(pageSource, /<HomeRenderer/);
assert.match(pageSource, /Promise\.allSettled/);
assert.match(pageSource, /defaultCompanySettings/);
assert.doesNotMatch(rendererSource, /renderHomeCmsHtml|sectionRegex|\.replace\(\/</);
assert.match(rendererSource, /resolveManagedHomeSection/);
assert.match(rendererSource, /shouldRenderHomeSection/);
assert.equal((headerSource.match(/<header/g) || []).length, 1);
assert.equal((footerSource.match(/<footer/g) || []).length, 1);
assert.match(contactSource, /if \(!page\) notFound\(\)/, "archived contact CMS disables the direct route");
assert.match(sitemapSource, /page\.page_type === "contact"/, "archived contact CMS is omitted from sitemap");
for (const id of ["featured-properties", "property-search", "latest-properties", "philosophy", "services", "calculators", "process", "calculator", "reminders", "team", "consult", "service-form"]) {
  assert.equal(rendererSource.includes(id) || readFileSync("components/home/legacy-section-content.ts", "utf8").includes(`\"${id}\"`), true, `preserves #${id}`);
}

console.log("CMS Phase 1 single renderer and registry tests passed");
