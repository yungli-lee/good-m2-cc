import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/(public)/properties/[slug]/page.tsx", "utf8");
const gallery = readFileSync("components/media/property-media-gallery.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

const mobileSections = ["cover", "summary", "copy", "media", "company"];
let previousIndex = -1;
for (const section of mobileSections) {
  const index = page.indexOf(`data-mobile-section="${section}"`);
  assert.ok(index > previousIndex, `mobile ${section} follows the requested reading order`);
  previousIndex = index;
}

assert.match(page, /display="cover"/, "the first mobile media block renders only the canonical cover");
assert.match(page, /display="details"/, "remaining media renders after summary and copy");
assert.match(page, /renderPropertySummary\(false\)/, "mobile summary excludes company information");
assert.match(page, /renderPropertySummary\(true\)/, "desktop summary keeps company information in its existing card");
assert.match(page, /property\.highlights\?\.length \?/, "missing highlights omit their section");
assert.match(page, /property\.description\?\.trim\(\) \?/, "missing descriptions omit their section");
assert.doesNotMatch(page, /物件特色整理中|詳細介紹整理中/, "empty copy does not create placeholder blocks");

assert.match(gallery, /type PropertyMediaGalleryDisplay = "all" \| "cover" \| "details"/);
assert.match(gallery, /display !== "details"/, "details-only mode omits the cover");
assert.match(gallery, /display !== "cover" && detailMedia\.length/, "cover-only mode omits remaining media");
assert.equal((gallery.match(/trackEvent\("view_property_media"/g) || []).length, 2, "existing click tracking taxonomy is unchanged");

assert.match(css, /\.property-detail-mobile \{\s*display: none;/, "mobile layout is hidden by default");
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.property-detail-desktop \{\s*display: none;/, "desktop layout is hidden only at the existing mobile breakpoint");
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.property-detail-mobile \{\s*display: block;/, "mobile layout is enabled at the existing mobile breakpoint");
assert.doesNotMatch(css, /property-detail[^}]*order\s*:/, "layout does not use CSS order to change reading order");

console.log("Mobile property detail order tests: PASS");
