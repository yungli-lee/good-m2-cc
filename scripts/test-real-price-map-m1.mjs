// M1 regression guard: static checks only; not a browser/Preview acceptance test.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const map=readFileSync("components/real-price/real-price-map-selection.tsx","utf8");
const api=readFileSync("app/api/admin/real-price-map-properties/route.ts","utf8");
const page=readFileSync("app/real-price/map/page.tsx","utf8");
const checks=[
 ["M1 map selection output",map.includes("setSelected({north:a.lat,west:a.lon,south:b.lat,east:b.lon})")],
 ["M1 pointer capture",map.includes("setPointerCapture(e.pointerId)")],
 ["M1 selection reset",map.includes("clearSelection")],
 ["M1 manual address mode",map.includes('lookupMode==="address"')],
 ["M1 parcel fields",["parcelDistrict","parcelSection","parcelNo"].every(x=>map.includes(x))],
 ["M1 parcel not falsely geocoded",map.includes("尚未接上政府地籍座標服務")],
 ["M1 address no-match explicit fallback",map.includes("setSuggestedStreet(street)")&&map.includes("改用路段定位")],
 ["M1 fallback not automatic",map.includes("setAddress(suggestedStreet)")],
 ["M1 authenticated property API",api.includes('requireApiRole(["editor","admin","owner"])')],
 ["M1 no private address exposure",!api.split(".select(").slice(1).some(x=>x.split(")")[0].includes("address_private"))],
 ["M1 public-only property select",api.includes('.select("id,title,listing_no,city,district,address_public,property_type")')],
 ["M1 public address assembled with deduplication",map.includes("const addr=buildPublicPropertyAddress(p)")&&map.includes("export function buildPublicPropertyAddress")],
 ["M1 address administrative-prefix normalization",map.includes('replace(/臺/g,"台")')&&map.includes("hasPrefix(result,city)")&&map.includes("hasPrefix(result,district)")],
 ["M1 selected property identity visible",map.includes("目前標的：")&&map.includes("公開地址：")&&map.includes("selectedProperty&&properties.some")],
 ["M1 Preview login error surfaced",map.includes("r.status===401||r.status===403")],
 ["M1 route noindex",page.includes("index:false")],
];
let failed=0;
for(const [label,pass] of checks){console.log((pass?"PASS":"FAIL")+" "+label);if(!pass)failed++;}
assert.equal(failed,0,failed+" M1 regression checks failed");
console.log("Static regression checks passed. Manual Preview browser verification is still required.");
