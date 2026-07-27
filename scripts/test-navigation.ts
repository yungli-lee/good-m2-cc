import assert from "node:assert/strict";
import { navigationItemSchema, resolveNavigationItem, type NavigationItem } from "../lib/navigation-core.ts";
import { renderHomeCmsHtml } from "../lib/home-cms/render.ts";

const base: NavigationItem = {
  id: "00000000-0000-4000-8000-000000000001",
  item_key: "cms-preview-test",
  location: "header",
  label: "CMS 測試頁",
  page_id: "00000000-0000-4000-8000-000000000002",
  href: null,
  target: "_self",
  sort_order: 250,
  is_visible: true,
  created_at: "2026-07-24T00:00:00.000Z",
  updated_at: "2026-07-24T00:00:00.000Z",
  site_pages: {
    page_key: "cms-preview-test",
    status: "published",
    archived_at: null
  }
};

assert.equal(resolveNavigationItem(base)?.href, "/cms-preview-test");
assert.equal(resolveNavigationItem({ ...base, site_pages: { ...base.site_pages!, status: "draft" } }), null);
assert.equal(resolveNavigationItem({ ...base, site_pages: { ...base.site_pages!, archived_at: "2026-07-24T01:00:00.000Z" } }), null);
assert.equal(resolveNavigationItem({ ...base, page_id: null, href: "/properties", site_pages: null })?.href, "/properties");

assert.equal(navigationItemSchema.safeParse({
  item_key: "external",
  location: "footer",
  label: "External",
  page_id: "",
  href: "https://example.com",
  target: "_blank",
  sort_order: "900",
  is_visible: "on"
}).success, true);

assert.equal(navigationItemSchema.safeParse({
  item_key: "conflict",
  location: "header",
  label: "Conflict",
  page_id: base.page_id,
  href: "/knowledge",
  target: "_self",
  sort_order: 1,
  is_visible: true
}).success, false);

assert.equal(navigationItemSchema.safeParse({
  item_key: "unsafe",
  location: "header",
  label: "Unsafe",
  page_id: "",
  href: "javascript:alert(1)",
  target: "_self",
  sort_order: 1,
  is_visible: true
}).success, false);

const staticHtml = `<header><nav class="site-nav" aria-label="主選單"><a href="/legacy">Legacy</a></nav></header><main></main><footer></footer>`;
const rendered = renderHomeCmsHtml(staticHtml, [], [], null, [
  base,
  { ...base, id: "00000000-0000-4000-8000-000000000003", location: "mobile" as const, label: "Mobile" },
  { ...base, id: "00000000-0000-4000-8000-000000000004", location: "footer" as const, label: "Footer" }
].map((item) => resolveNavigationItem(item)!).filter(Boolean));

assert.match(rendered, /CMS 測試頁/);
assert.match(rendered, /cms-nav-mobile-item/);
assert.match(rendered, /cms-footer-navigation/);
assert.doesNotMatch(rendered, /Legacy/);

console.log("navigation contract tests passed");
