import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const collections = readFileSync("components/home/home-data-driven-sections.tsx", "utf8");
const carousel = readFileSync("components/home/property-carousel.tsx", "utf8");
const search = readFileSync("components/home/home-property-search.tsx", "utf8");
const css = readFileSync("public/legacy-static/styles.css", "utf8");

assert.match(
  carousel,
  /className="property-carousel"><div className="property-card-track" ref={trackRef}>/,
  "homepage discovery tracks are contained by their carousel viewport"
);
assert.match(
  search,
  /results\.length \? <div className="property-carousel"><div className="property-card-track">/,
  "search result tracks use the same contained carousel viewport"
);
assert.match(css, /\.property-discovery \{[\s\S]*?min-width: 0;[\s\S]*?width: 100%;[\s\S]*?max-width: 1180px;/);
assert.match(css, /\.property-carousel \{[\s\S]*?min-width: 0;[\s\S]*?max-width: 100%;[\s\S]*?overflow-x: auto;/);
assert.match(css, /\.property-card-track \{[\s\S]*?grid-auto-flow: column;[\s\S]*?grid-auto-columns: calc\(\(100% - 32px\) \/ 3\);/);
assert.match(css, /@media \(min-width: 901px\) and \(max-width: 1100px\)[\s\S]*?grid-auto-columns: calc\(\(100% - 16px\) \/ 2\);/);
assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.property-card-track \{[\s\S]*?grid-auto-columns: minmax\(280px, 82vw\);/);
assert.match(collections, /autoplay={autoplay} intervalSeconds={intervalSeconds}/);
assert.match(carousel, /prefers-reduced-motion: reduce/);
assert.doesNotMatch(carousel, /onMouseEnter|onMouseLeave/, "desktop pointer hover must not disable autoplay");
assert.match(carousel, /onFocusCapture[\s\S]*?onBlurCapture/, "keyboard focus pauses autoplay for accessible interaction");
assert.doesNotMatch(css, /(?:html|body)[^{}]*\{[^}]*overflow-x:\s*(?:hidden|clip)/, "document overflow is not globally hidden");

console.log("homepage carousel hotfix tests passed");
