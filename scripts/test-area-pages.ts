import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { areaPages, getAreaPage } from "../lib/areas.ts";

const page = readFileSync("app/(public)/areas/[slug]/page.tsx", "utf8");
const index = readFileSync("app/(public)/areas/page.tsx", "utf8");
const queries = readFileSync("lib/properties/queries.ts", "utf8");
const sitemap = readFileSync("app/sitemap.ts", "utf8");

assert.deepEqual(areaPages.map((area) => area.slug), ["changhua-city", "xiushui", "lukang"]);
assert.ok(areaPages.every((area) => area.features.length === 3));
assert.ok(areaPages.every((area) => area.faqs.length >= 4));
assert.equal(getAreaPage("changhua-city")?.name, "彰化市");
assert.equal(getAreaPage("missing"), null);
assert.match(page, /listPublishedPropertiesByArea\(area\.searchTerms\)/);
assert.match(page, /status|公開物件/);
assert.match(page, /BreadcrumbList/);
assert.match(page, /href="\/contact"/);
assert.match(index, /areaPages\.map/);
assert.match(queries, /\.eq\("status", "published"\)/);
assert.match(queries, /address_public\.ilike/);
assert.match(sitemap, /areaPages\.map/);

console.log("area pages regression checks passed");
