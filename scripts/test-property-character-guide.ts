import assert from "node:assert/strict";
import { buildPropertyGuide, type GuideProperty } from "../lib/properties/character-guide.ts";
import { guideSpeechText, selectGuideVoice } from "../lib/properties/guide-voice.ts";

const base: GuideProperty = { title: "鹿港測試透天", city: "彰化縣", district: "鹿港鎮", price: 1280, land_area_ping: 23.567, building_area_ping: 48, layout: "4房2廳3衛", age: 0, orientation: "坐東朝西", property_type: "townhouse", highlights: ["前院停車", " ", "近公園"] };
const scripts = buildPropertyGuide({ ...base, owner_phone: "PRIVATE-PHONE", floor_price: "PRIVATE-PRICE" } as GuideProperty, "透天住宅");
for (const role of Object.values(scripts)) {
  assert.match(role.overview, /彰化縣鹿港鎮/);
  assert.match(role.overview, /1,280 萬元/);
  assert.match(role.details, /23.57 坪/);
  assert.match(role.details, /屋齡 0 年/);
  assert.match(role.highlights, /前院停車；近公園/);
  assert.doesNotMatch(JSON.stringify(role), /PRIVATE-/);
}
const empty = buildPropertyGuide({ ...base, price: null, land_area_ping: null, building_area_ping: NaN, layout: null, age: null, orientation: null, highlights: [] }, "透天住宅");
assert.match(empty.ayong.overview, /價格歡迎直接洽詢/);
assert.match(empty.amei.details, /沒有完整/);
assert.match(empty.ayong.highlights, /沒有另外列出/);
assert.doesNotMatch(JSON.stringify(empty), /NaN|undefined|null/);
const land = buildPropertyGuide({ ...base, property_type: "farmland" }, "農地");
assert.doesNotMatch(land.ayong.details, /格局|屋齡/);
assert.notEqual(scripts.ayong.overview, scripts.amei.overview);
const capped = buildPropertyGuide({ ...base, highlights: ["a".repeat(250), "第二", "第三", "不應出現的第四"] }, "透天住宅");
assert.doesNotMatch(capped.ayong.highlights, /不應出現的第四/);
assert.ok(capped.ayong.highlights.length < 300);
console.log("Character guide: current public facts, missing-data fallbacks, land rules, private field exclusion and bounded copy PASS");
const femaleVoice = { name: "Mei-Jia", lang: "zh-TW", voiceURI: "female", localService: true };
const maleVoice = { name: "Microsoft YunJhe Online (Natural)", lang: "zh-TW", voiceURI: "male", localService: false };
assert.equal(selectGuideVoice([femaleVoice, maleVoice], "ayong")?.voiceURI, "male");
assert.equal(selectGuideVoice([femaleVoice, maleVoice], "amei")?.voiceURI, "female");
assert.equal(selectGuideVoice([femaleVoice], "ayong"), undefined);
assert.equal(selectGuideVoice([], "amei"), undefined);
assert.match(guideSpeechText("格局4房2廳3衛；土地23坪。"), /4 房，2 廳，3 衛。土地/);
assert.equal(guideSpeechText("開價 1,280 萬元。格局 4/3/4。"), "開價 1280 萬元。格局 4 房，3 廳，4 衛。");
console.log("Guide voice: distinct known male/female routing, missing male fallback and natural punctuation PASS");
