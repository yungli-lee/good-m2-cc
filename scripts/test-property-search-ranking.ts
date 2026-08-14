import assert from "node:assert/strict";
import { parsePropertySearch, propertySearchKeywordVariants, rankPropertySearchResults } from "../lib/properties/search.ts";

const parsed = parsePropertySearch("鹿港 1000萬以下 農地");
assert.deepEqual(parsed, {
  keywords: ["鹿港"],
  propertyTypes: ["farmland"],
  typeKeyword: "農地",
  price: 1000,
  priceMode: "below"
});

assert.deepEqual(parsePropertySearch("農舍").propertyTypes, ["farmhouse"]);

const rows = [
  { title: "福興農舍", district: "福興鄉", address_public: "彰化縣福興鄉彰鹿路", description: "往鹿港交通方便" },
  { title: "近鹿港｜植村墅 III", district: "福興鄉", address_public: "彰化縣福興鄉彰鹿路七段", description: "" },
  { title: "龍山雙寺黃金建地", district: "鹿港鎮", address_public: "彰化縣鹿港鎮德興街", description: "" }
];

const ranked = rankPropertySearchResults(rows, ["鹿港"], 24);
assert.equal(ranked[0].district, "鹿港鎮");
assert.equal(ranked[1].title, "近鹿港｜植村墅 III");
assert.equal(ranked[2].title, "福興農舍");

const exactPhrase = parsePropertySearch("鹿港");
assert.deepEqual(exactPhrase.keywords, ["鹿港"]);
assert.ok(!exactPhrase.keywords.includes("鹿"));
assert.ok(!exactPhrase.keywords.includes("港"));

assert.deepEqual(parsePropertySearch("三房").keywords, ["三房"]);
assert.equal(parsePropertySearch("三房").price, null);
assert.deepEqual(propertySearchKeywordVariants("三房"), ["三房", "3房"]);
assert.deepEqual(parsePropertySearch("土地").propertyTypes, ["farmland", "building_land", "industrial_land"]);
assert.equal(parsePropertySearch("土地").typeKeyword, "土地");
assert.deepEqual(parsePropertySearch("鹿港中山路").keywords, ["鹿港", "中山路"]);
assert.deepEqual(parsePropertySearch("彰化市民權路").keywords, ["彰化市", "民權路"]);
assert.deepEqual(parsePropertySearch("民生路").keywords, ["民生路"]);

const roadResults = rankPropertySearchResults([
  { title: "民權路店住", district: "鹿港鎮", address_public: "彰化縣鹿港鎮民權路" },
  { title: "民權路透天", district: "彰化市", address_public: "彰化縣彰化市民權路" }
], parsePropertySearch("彰化市民權路").keywords, 24);
assert.equal(roadResults[0].district, "彰化市");

const typeFallbackResults = rankPropertySearchResults([
  { title: "950坪大面寬農地", property_type: "building_land" },
  { title: "一般建地", property_type: "building_land" }
], ["農地"], 24);
assert.equal(typeFallbackResults[0].title, "950坪大面寬農地");

console.log("property search ranking tests passed");
