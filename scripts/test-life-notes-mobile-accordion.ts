import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toggleReminder } from "../lib/home-cms/reminder-accordion.ts";

const root = process.cwd();
const component = readFileSync(resolve(root, "components/home/mobile-reminder-accordion.tsx"), "utf8");
const desktop = readFileSync(resolve(root, "components/home/managed-section.tsx"), "utf8");
const styles = readFileSync(resolve(root, "public/legacy-static/styles.css"), "utf8");

const ids = ["normal-egg", "extension-cord", "with-image", "last-note"];
for (const position of [0, 1, ids.length - 1]) {
  const target = ids[position];
  let open = new Set([ids[0]]);
  open = toggleReminder(open, target);
  assert.equal(open.has(target), target === ids[0] ? false : true, `item at position ${position} toggles independently`);
  for (const id of ids) {
    if (id !== target) assert.equal(open.has(id), id === ids[0], `${target} must not change ${id}`);
  }
  open = toggleReminder(open, target);
  assert.equal(open.has(target), target === ids[0], `item at position ${position} toggles back`);
}

assert.match(component, /data-react-managed/, "React accordion must be excluded from the legacy one-shot binder");
assert.match(component, /aria-controls={panelId}/, "each trigger must target its own panel");
assert.match(component, /aria-expanded={isOpen}/, "each trigger must expose its own state");
assert.match(component, /page\.media_public_url[\s\S]*cms-reminder-cover/, "items with images must render their cover");
assert.match(component, /onClick={\(\) => setOpenIds\(\(current\) => toggleReminder\(current, page\.id\)\)}/, "every trigger must update state by stable media-independent id");
assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.life-note-mobile-grid\s*{\s*display:\s*grid;/, "mobile accordion must render below 900px");
assert.match(desktop, /className="life-note-card-link"/, "desktop cards must remain clickable");
assert.match(desktop, /life-note-card-placeholder/, "desktop no-image fallback must remain intact");

console.log("Life Notes mobile accordion regression checks passed.");
