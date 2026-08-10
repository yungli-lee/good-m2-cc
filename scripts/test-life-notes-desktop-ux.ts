import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const component = readFileSync(resolve(root, "components/home/managed-section.tsx"), "utf8");
const styles = readFileSync(resolve(root, "public/legacy-static/styles.css"), "utf8");
const script = readFileSync(resolve(root, "public/legacy-static/script.js"), "utf8");

assert.match(component, /life-note-desktop-grid/, "desktop reminders grid must render");
assert.match(component, /life-note-mobile-grid/, "mobile reminders grid must remain separate");
assert.equal(component.split('href={`/${page.page_key}`}').length - 1, 2, "desktop and mobile cards must reuse the public detail route");
assert.match(component, /life-note-card-placeholder/, "cards without an image must keep a stable media area");
assert.ok(component.includes('aria-label={`閱讀全文：${page.title}`}'), "desktop card link must have an accessible name");
assert.match(component, /article-card\${index === 0 \? " is-open" : ""}/, "first mobile reminder must remain open by default");
assert.match(component, /<b>{index === 0 \? "收合" : "展開"}<\/b>/, "mobile toggle labels must remain unchanged");

assert.match(styles, /\.life-note-mobile-grid\s*{\s*display:\s*none;/, "mobile accordion must be hidden on desktop");
assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.life-note-desktop-grid\s*{\s*display:\s*none;/, "desktop cards must be hidden at the existing mobile breakpoint");
assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.life-note-mobile-grid\s*{\s*display:\s*grid;/, "mobile accordion must be restored at the existing breakpoint");
assert.match(styles, /\.life-note-card-image[\s\S]*?aspect-ratio:\s*16 \/ 9;/, "desktop media ratio must remain consistent");

assert.match(script, /document\.querySelectorAll\("\.article-card(?::not\(\[data-react-managed\]\))?"\)/, "legacy mobile accordion binding must remain intact");
assert.doesNotMatch(script, /life-note-card/, "desktop card links must not receive accordion handlers");

console.log("Life Notes desktop UX regression checks passed.");
