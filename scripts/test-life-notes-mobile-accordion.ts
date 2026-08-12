import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toggleReminder } from "../lib/home-cms/reminder-accordion.ts";

const root = process.cwd();
const component = readFileSync(resolve(root, "components/home/mobile-reminder-accordion.tsx"), "utf8");
const desktop = readFileSync(resolve(root, "components/home/managed-section.tsx"), "utf8");
const desktopCards = readFileSync(resolve(root, "components/home/desktop-reminders.tsx"), "utf8");
const styles = readFileSync(resolve(root, "public/legacy-static/styles.css"), "utf8");

const abnormal = { id: "extension-cord", title: "延長線不是插得下就能一直插！", image: null };
const otherNotes = [
  { id: "normal-egg", title: "看懂雞蛋編碼", image: "/egg.jpg" },
  { id: "with-image", title: "有圖片提醒", image: "/note.jpg" },
  { id: "without-image", title: "無圖片提醒", image: null }
];

for (const position of [0, 1, otherNotes.length]) {
  const reminders = [...otherNotes];
  reminders.splice(position, 0, abnormal);
  const initialId = reminders[0].id;
  let open = new Set([initialId]);
  open = toggleReminder(open, abnormal.id);
  assert.equal(open.has(abnormal.id), abnormal.id === initialId ? false : true, `abnormal item at position ${position} toggles independently`);
  for (const reminder of reminders) {
    if (reminder.id !== abnormal.id) assert.equal(open.has(reminder.id), reminder.id === initialId, `${abnormal.id} must not change ${reminder.id}`);
  }
  open = toggleReminder(open, abnormal.id);
  assert.equal(open.has(abnormal.id), abnormal.id === initialId, `abnormal item at position ${position} toggles back`);
}

assert.ok(otherNotes.some((note) => note.image) && otherNotes.some((note) => !note.image), "fixtures must include image and no-image reminders");

assert.match(component, /data-react-managed/, "React accordion must be excluded from the legacy one-shot binder");
assert.match(component, /aria-controls={panelId}/, "each trigger must target its own panel");
assert.match(component, /aria-expanded={isOpen}/, "each trigger must expose its own state");
assert.match(component, /page\.media_public_url[\s\S]*cms-reminder-cover/, "items with images must render their cover");
assert.match(component, /onClick={\(\) => setOpenIds\(\(current\) => toggleReminder\(current, page\.id\)\)}/, "every trigger must update state by stable media-independent id");
assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.life-note-mobile-grid\s*{\s*display:\s*grid;/, "mobile accordion must render below 900px");
assert.match(desktop, /<DesktopReminders pages={pages} \/>/, "managed section must render desktop reminders");
assert.match(desktopCards, /life-note-card-placeholder/, "desktop no-image fallback must remain intact");
assert.match(component, /slice\(0, visibleCount\)/, "mobile initially limits reminders");

console.log("Life Notes mobile accordion regression checks passed.");
