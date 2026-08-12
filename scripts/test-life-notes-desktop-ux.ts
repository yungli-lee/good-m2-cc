import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const component = readFileSync(resolve(root, "components/home/managed-section.tsx"), "utf8");
const desktop = readFileSync(resolve(root, "components/home/desktop-reminders.tsx"), "utf8");
const mobile = readFileSync(resolve(root, "components/home/mobile-reminder-accordion.tsx"), "utf8");
const styles = readFileSync(resolve(root, "public/legacy-static/styles.css"), "utf8");
const script = readFileSync(resolve(root, "public/legacy-static/script.js"), "utf8");

assert.match(desktop, /life-note-desktop-grid/, "desktop reminders grid must render");
assert.match(mobile, /life-note-mobile-grid/, "mobile reminders grid must remain separate");
assert.doesNotMatch(desktop + mobile, /href={`\/\${page\.page_key}`}/, "reminders must not link to cancelled standalone pages");
assert.match(desktop, /life-note-card-placeholder/, "cards without an image must keep a stable media area");
assert.match(desktop, /slice\(0, visibleCount\)/, "desktop initially limits reminders");
assert.match(desktop, /Math\.min\(count \+ 4, pages\.length\)/, "desktop reveals four more reminders at a time");
assert.match(component, /<MobileReminderAccordion pages={pages} \/>/, "managed reminders must delegate mobile interaction to React");
assert.match(mobile, /new Set\(pages\[0\] \? \[pages\[0\]\.id\] : \[\]\)/, "first mobile reminder must remain open by default");
assert.match(mobile, /<b>{isOpen \? "收合" : "展開"}<\/b>/, "mobile toggle labels must remain unchanged");
assert.match(mobile, /data-react-managed/, "legacy script must ignore the React-managed mobile cards");

assert.match(styles, /\.life-note-mobile-grid\s*{\s*display:\s*none;/, "mobile accordion must be hidden on desktop");
assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.life-note-desktop-grid\s*{\s*display:\s*none;/, "desktop cards must be hidden at the existing mobile breakpoint");
assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.life-note-mobile-grid\s*{\s*display:\s*grid;/, "mobile accordion must be restored at the existing breakpoint");
assert.match(styles, /\.life-note-card-image[\s\S]*?aspect-ratio:\s*16 \/ 9;/, "desktop media ratio must remain consistent");

assert.match(script, /document\.querySelectorAll\("\.article-card(?::not\(\[data-react-managed\]\))?"\)/, "legacy mobile accordion binding must remain intact");
assert.doesNotMatch(script, /life-note-card/, "desktop card links must not receive accordion handlers");

console.log("Life Notes desktop UX regression checks passed.");
