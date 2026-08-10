import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const collections = readFileSync("components/home/home-data-driven-sections.tsx", "utf8");
const search = readFileSync("components/home/home-property-search.tsx", "utf8");
const css = readFileSync("public/legacy-static/styles.css", "utf8");

assert.match(
  collections,
  /className="property-discovery"><div className="property-carousel"><div className="property-card-track">/,
  "homepage discovery tracks are contained by their carousel viewport"
);
assert.match(
  search,
  /results\.length \? <div className="property-carousel"><div className="property-card-track">/,
  "search result tracks use the same contained carousel viewport"
);
assert.match(css, /\.property-discovery \{[\s\S]*?min-width: 0;[\s\S]*?width: 100%;[\s\S]*?max-width: 1180px;/);
assert.match(css, /\.property-carousel \{[\s\S]*?min-width: 0;[\s\S]*?max-width: 100%;[\s\S]*?overflow-x: auto;/);
assert.match(css, /\.property-card-track \{[\s\S]*?grid-auto-flow: column;[\s\S]*?grid-auto-columns: calc\(\(100% - 16px\) \/ 2\);/);
assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.property-card-track \{[\s\S]*?grid-auto-columns: minmax\(280px, 82vw\);/);
assert.doesNotMatch(css, /(?:html|body)[^{}]*\{[^}]*overflow-x:\s*(?:hidden|clip)/, "document overflow is not globally hidden");

console.log("homepage carousel hotfix tests passed");
