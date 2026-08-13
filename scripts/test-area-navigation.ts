import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homeAudience = readFileSync("components/home/home-audience-paths.tsx", "utf8");
const homeHeader = readFileSync("components/home/home-header.tsx", "utf8");
const homeFooter = readFileSync("components/home/home-footer.tsx", "utf8");
const siteHeader = readFileSync("components/layout/site-header.tsx", "utf8");
const siteFooter = readFileSync("components/layout/site-footer.tsx", "utf8");

assert.match(homeAudience, /href="\/areas"[^>]*>依地區找房/);
for (const header of [homeHeader, siteHeader]) {
  assert.match(header, /href="\/areas"/);
  assert.match(header, />服務地區</);
  assert.match(header, /hasAreaMobileLink/);
}
for (const footer of [homeFooter, siteFooter]) {
  assert.match(footer, /href="\/areas"/);
  assert.match(footer, />服務地區</);
  assert.match(footer, /hasAreaFooterLink/);
}

console.log("area navigation regression checks passed");
