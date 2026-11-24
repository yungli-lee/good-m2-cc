import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync("components/real-price/real-price-map-selection.tsx","utf8");
const expected=[
 'setSelected(null);setRect(null);setQueryState({status:"idle"});',
 'const clearSelection=()=>',
 'setQueryState({status:"error",message:',
 'disabled={!selected}',
];
for(const token of expected)assert.ok(source.includes(token),"Missing M2 state guard: "+token);
for(const fragment of source.match(/setSelected\(null\);setRect\(null\);/g)||[])assert.ok(fragment);
const total=(source.match(/setSelected\(null\);setRect\(null\);/g)||[]).length;
const resets=(source.match(/setSelected\(null\);setRect\(null\);setQueryState\(\{status:"idle"\}\);/g)||[]).length;
assert.equal(total,resets,"Every cleared bounding box must clear stale query status");
console.log("M2 selection-reset static guards passed; Preview interaction still requires separate verification.");
