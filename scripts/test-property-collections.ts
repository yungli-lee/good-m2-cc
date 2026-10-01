import assert from "node:assert/strict";
import { parseCollectionForm, propertyCollectionFilters, propertyCollectionCoverUrl, propertyCollectionHref } from "../lib/property-collections/core.ts";
import { collectionFilters, collectionHref, collectionLabel } from "../lib/properties/collection-link.ts";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ slug: "lukang-2000", title: "鹿港・福興・秀水｜2000萬內精選", description: "阿勇與阿美為你介紹", status: "draft", price_max: "2000", property_type: "residential", ...overrides })) data.set(key, value);
  for (const district of ["鹿港鎮", "福興鄉", "秀水鄉"]) data.append("district", district);
  return data;
}
const parsed = parseCollectionForm(form());
assert.ok(parsed.success);
assert.equal(parsed.data.price_min, null);
assert.equal(parsed.data.price_max, 2000);
const filters = propertyCollectionFilters(parsed.data);
assert.deepEqual(filters.districts, ["鹿港鎮", "福興鄉", "秀水鄉"]);
assert.equal(filters.maxPrice, 2000);
const url = new URL(collectionHref(filters), "https://good.m2.cc");
const restored = collectionFilters(Object.fromEntries([...url.searchParams.keys()].map(key => [key, url.searchParams.getAll(key)])));
assert.deepEqual(restored, filters);
assert.ok(collectionLabel(restored).includes("2000萬以下"));
const invalidCases: Array<Record<string, string>> = [{ price_min: "3000", price_max: "2000" }, { price_max: "NaN" }, { price_min: "-1" }, { price_max: "Infinity" }, { property_type: "__proto__" }, { slug: "../admin" }, { slug: "bad_slug" }, { title: " " }, { status: "deleted" }, { cover_storage_path: "https://evil.example/image.jpg" }];
for (const overrides of invalidCases) assert.equal(parseCollectionForm(form(overrides)).success, false, JSON.stringify(overrides));
const invalidDistrict = form(); invalidDistrict.append("district", "無效地區");
assert.equal(parseCollectionForm(invalidDistrict).success, false);
const saved = parseCollectionForm(form({ slug: "attacker-new-slug" }), "original-slug");
assert.ok(saved.success); assert.equal(saved.data.slug, "original-slug");
const cover = "property-collections/cover-3f07debc-0542-46cc-b3c4-a8d4f29e9f06.jpg";
assert.equal(propertyCollectionCoverUrl(cover, "https://example.supabase.co"), `https://example.supabase.co/storage/v1/object/public/media/${cover}`);
assert.equal(propertyCollectionCoverUrl("../private/secret.jpg", "https://example.supabase.co"), null);
assert.equal(propertyCollectionCoverUrl(cover, "http://example.supabase.co"), null);
assert.equal(propertyCollectionHref("lukang-2000"), "/collections/lukang-2000");
assert.deepEqual(collectionFilters({ price_max: "2000", price_min: "500" }), { q: "", city: "", districts: [], type: "", minPrice: 500, maxPrice: 2000 });
assert.equal(collectionFilters({ price_max: "Infinity" }).maxPrice, undefined);
console.log("Property collections: validation, immutable links, filter roundtrip and safe covers PASS");
