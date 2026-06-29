import assert from "node:assert/strict";

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

const incomingTownhouse = parsePastedProperty(`
新接物件-透天
案名：彰化市透天測試
`);

assert.equal(incomingTownhouse.property_type, "townhouse");

const incomingLand = parsePastedProperty(`
新接物件-土地
案名：彰化市土地測試
`);

assert.equal(incomingLand.property_type, "land");

const incomingBuilding = parsePastedProperty(`
新接物件-大樓華廈
案名：彰化市大樓華廈測試
`);

assert.equal(incomingBuilding.property_type, "building");

console.log("ai-parser tests passed");
