// M2 contract regression checks: static guard, no official data or DB access.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const s=readFileSync("lib/real-price/map-query-contract.ts","utf8");
for(const token of [
 "DEFAULT_PAGE_SIZE:PageSize=10",
 "PAGE_SIZES=[5,10,15,20]",
 "row.latitude!==null && row.longitude!==null",
 "row.latitude>=b.south && row.latitude<=b.north",
 "row.longitude>=b.west && row.longitude<=b.east",
 ".sort((a,c)=>a.sourceOrder-c.sourceOrder)",
 "sourceOrder:number",
 "土地每坪單價",
 "官方備註",
 "測試樣本：非內政部官方成交紀錄",
]) {
 assert.ok(s.includes(token),"Missing M2 invariant: "+token);
}
assert.ok(!s.includes("Math.random"),"No invented transaction values");
console.log("M2 contract static guards passed; API, real-data binding and Preview acceptance remain pending.");

// Switching the target invalidates a previously selected spatial query.
const ui=readFileSync("components/real-price/real-price-map-selection.tsx","utf8");
for(const fragment of [
 'setSelectedProperty(id);setLocated(null);setSuggestedStreet("");setLocationError("");setSelected(null);setRect(null);setQueryState({status:"idle"})',
 'setAddress(e.target.value);setSelectedProperty("");setLocated(null);setSuggestedStreet("");setLocationError("");setSelected(null);setRect(null);setQueryState({status:"idle"})',
 'setSelectedProperty("");setSelected(null);setRect(null);setQueryState({status:"idle"})',
])assert.ok(ui.includes(fragment),"Stale bbox must be invalidated: "+fragment);
console.log("M2 target-change selection invalidation static guards passed.");
