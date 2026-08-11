import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { heroOverlayStrengthLabels, normalizeHeroOverlayStrength } from "../lib/home-cms/hero-overlay.ts";

const root = process.cwd();
const migration = readFileSync(resolve(root, "supabase/migrations/202608110101_home_campaign_overlay_strength.sql"), "utf8");
const carousel = readFileSync(resolve(root, "components/home/home-campaign-carousel.tsx"), "utf8");
const form = readFileSync(resolve(root, "components/admin/home-campaign-form.tsx"), "utf8");
const schema = readFileSync(resolve(root, "lib/home-cms/schema.ts"), "utf8");
const css = readFileSync(resolve(root, "public/legacy-static/styles.css"), "utf8");

for (const value of ["none", "light", "medium", "dark"] as const) {
  assert.equal(normalizeHeroOverlayStrength(value), value, `${value} remains a valid per-slide value`);
}
for (const legacyValue of [undefined, null, "", "unknown", 0]) {
  assert.equal(normalizeHeroOverlayStrength(legacyValue), "medium", "legacy and unknown values fall back to medium");
}
assert.deepEqual(Object.values(heroOverlayStrengthLabels), ["無", "淡", "中", "深"]);

assert.match(migration, /add column if not exists overlay_strength text default 'medium'/);
assert.match(migration, /overlay_strength in \('none', 'light', 'medium', 'dark'\)/);
assert.doesNotMatch(migration, /\b(update|insert|delete|truncate)\b/i, "migration must not mutate existing rows");
assert.doesNotMatch(migration, /media_assets|analytics/i, "migration is limited to the campaign column");

assert.match(schema, /overlay_strength: z\.enum\(heroOverlayStrengthValues\)\.default\("medium"\)/);
assert.match(form, /name="overlay_strength"/);
assert.match(form, /normalizeHeroOverlayStrength\(campaign\?\.overlay_strength\)/);
assert.match(carousel, /data-overlay-strength={normalizeHeroOverlayStrength\(campaign\.overlay_strength\)}/);

assert.match(css, /\.hero-media::after \{[\s\S]*?rgba\(19, 41, 75, 0\.72\)[\s\S]*?rgba\(19, 41, 75, 0\.32\)[\s\S]*?rgba\(19, 41, 75, 0\.04\)/, "medium keeps the production desktop gradient");
assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.hero-media::after \{[\s\S]*?rgba\(19, 41, 75, 0\.16\)[\s\S]*?rgba\(19, 41, 75, 0\.82\)/, "medium keeps the production mobile gradient");
for (const value of ["none", "light", "dark"]) {
  assert.match(css, new RegExp(`data-overlay-strength="${value}"`), `${value} has a CSS override`);
}
assert.match(css, /@media \(max-width: 900px\)[\s\S]*?data-overlay-strength="none"[\s\S]*?data-overlay-strength="light"[\s\S]*?data-overlay-strength="dark"/, "mobile retains per-slide strength overrides");
assert.match(css, /\.hero-media img \{[\s\S]*?object-fit: cover;/, "desktop image framing remains cover");
assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.hero-media img \{[\s\S]*?object-fit: contain;/, "mobile image framing remains contain");
assert.match(carousel, /setActive\(index\)/, "carousel switching remains intact");
assert.match(carousel, /className="hero-copy"/, "title, subtitle and CTA layer remains intact");

console.log("Homepage hero overlay control tests passed.");
