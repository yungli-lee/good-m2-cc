import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/(public)/properties/[slug]/page.tsx", "utf8");

assert.doesNotMatch(page, /Sprint C/);
assert.doesNotMatch(page, /物件詢問表單將在/);
assert.match(page, /Line 阿勇諮詢/);
assert.match(page, /填寫服務表單/);

console.log("property detail public copy regression checks passed");
