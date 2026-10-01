import assert from "node:assert/strict";
import { collectionFilters, collectionHref, collectionLabel, collectionTypes } from "../lib/properties/collection-link.ts";
import { parsePropertySearch } from "../lib/properties/search.ts";

for (const q of ["鹿港農地", "鹿港住宅", "福興", "秀水", "鹿港 800萬以下 三房"]) {
  const before = collectionFilters({ q });
  const url = new URL(collectionHref(before), "https://good.m2.cc");
  assert.deepEqual(collectionFilters({ q: url.searchParams.get("q") || undefined }), before, "Chinese search survives copy/reload");
}
const combined = collectionFilters({ district: ["秀水鄉", "福興鄉", "秀水鄉", "invalid"], type: "residential" });
assert.deepEqual(combined.districts, ["福興鄉", "秀水鄉"], "multi-area is stable and deduplicated");
assert.equal(collectionLabel(combined), "福興、秀水｜住宅");
const url = new URL(collectionHref(combined), "https://good.m2.cc");
assert.deepEqual(collectionFilters({ district: url.searchParams.getAll("district"), type: url.searchParams.get("type") || undefined }), combined);
assert.equal(collectionFilters({ type: "__proto__" }).type, "", "untrusted types must not enter query builder");
assert.equal(collectionFilters({ q: "a".repeat(300) }).q.length, 200);
assert.deepEqual(parsePropertySearch("鹿港住宅").propertyTypes, [...collectionTypes.residential.values]);
assert.deepEqual(parsePropertySearch("鹿港住宅").keywords, ["鹿港"]);
assert.deepEqual(parsePropertySearch("鹿港農地").propertyTypes, ["farmland"]);
assert.equal(collectionHref(collectionFilters({})), "/properties");
console.log("Property collection link roundtrip and filters: PASS");
