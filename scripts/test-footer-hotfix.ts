import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const footer = readFileSync("components/layout/site-footer.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

assert.match(footer, /site-app-footer-shell/);
assert.match(footer, /className="container site-app-footer"/, "footer uses the shared max-width container");
assert.match(footer, /site-app-footer-brand/);
assert.match(footer, /site-app-footer-services/);
assert.match(css, /\.site-app-footer \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)/, "desktop uses a deterministic balanced grid");
assert.match(css, /\.site-app-footer-services \{[\s\S]*justify-content: end/);
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.site-app-footer \{[\s\S]*grid-template-columns: 1fr/, "mobile returns to a single-column layout");
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.site-app-footer-nav,[\s\S]*\.site-app-footer-services \{[\s\S]*justify-content: center/, "mobile footer content stays centered");

console.log("footer hotfix tests passed");
