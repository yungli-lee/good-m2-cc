import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { highlightsToArray } from "../lib/properties/schema.ts";

const page = readFileSync("app/(public)/properties/[slug]/page.tsx", "utf8");

assert.doesNotMatch(page, /Sprint C/);
assert.doesNotMatch(page, /物件詢問表單將在/);
assert.match(page, /Line 阿勇諮詢/);
assert.match(page, /填寫服務表單/);

const source = [
  "原本還在觀望花壇透天的",
  "這間價格真的可以再看一次！",
  "現在開價只要 898 萬",
  "不到千萬就能入手四樓透天＋前院停車。",
  "鄰近市區，採買方便、生活機能完整。",
  "✅ 總地坪約 31.91 坪"
].join("\n");

assert.deepEqual(highlightsToArray(source), source.split("\n"));
assert.deepEqual(highlightsToArray("第一行\r\n第二行，標點保留！"), ["第一行", "第二行，標點保留！"]);
assert.match(page, /const highlightsText = \(property\.highlights \|\| \[\]\)\.join\("\\n"\)/);
assert.match(page, /whiteSpace: "pre-wrap"/);
assert.doesNotMatch(page, /property\.highlights\.map/);

console.log("property detail public copy regression checks passed");
