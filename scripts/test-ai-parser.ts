import assert from "node:assert/strict";

// @ts-expect-error Node strip-types runs this script directly with a TypeScript extension import.
const { parsePastedProperty } = await import("../lib/properties/ai-parser.ts");

const parsed = parsePastedProperty(`
案名：彰化市測試華廈
樓高：2樓
開價：1288萬
`);

assert.equal(parsed.floor, "2樓");
assert.equal(parsed.price, "1288");

const mixedLine = parsePastedProperty(`
案名：彰化市測試華廈
坐向：坐西北朝東南 樓高：2樓
`);

assert.equal(mixedLine.floor, "2樓");
assert.equal(mixedLine.orientation, "坐西北朝東南");

console.log("ai-parser tests passed");
