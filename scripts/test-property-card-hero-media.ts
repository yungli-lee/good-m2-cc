import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveMediaDelivery, mediaTierPolicies } from "../lib/media/delivery.ts";
import { shouldLoadHeroImage, shouldTransformHeroImage } from "../lib/media/home-carousel-image.ts";

// Render the real TSX components without introducing a test-runner dependency.
const nativeRequire = createRequire(import.meta.url);
const modules = new Map<string, { exports: Record<string, ComponentType<Record<string, unknown>>> }>();
function loadSource(filename: string): Record<string, ComponentType<Record<string, unknown>>> {
  const path = [filename, `${filename}.tsx`, `${filename}.ts`].find(existsSync)!;
  if (modules.has(path)) return modules.get(path)!.exports;
  const loadedModule = { exports: {} };
  modules.set(path, loadedModule);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
  runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: path })(
    (id: string) => id.startsWith("@/") ? loadSource(resolve(id.slice(2)))
      : id.startsWith(".") ? loadSource(resolve(dirname(path), id)) : nativeRequire(id), loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const url = "https://project.supabase.co/storage/v1/object/public/property-media/owner/photo.jpeg";
const delivery = resolveMediaDelivery({ publicUrl: url }, "property-card");
assert.deepEqual(delivery.widths, [384, 640, 960]);
assert.equal(delivery.quality, 80);
assert.equal(mediaTierPolicies.card.quality, 75);
for (const candidate of delivery.srcSet.split(", ")) {
  const [src, descriptor] = candidate.split(" ");
  const params = new URL(src).searchParams;
  assert.equal(params.get("resize"), "contain");
  assert.equal(params.get("quality"), "80");
  assert.equal(params.has("height"), false);
  assert.ok(["384w", "640w", "960w"].includes(descriptor));
}
for (const fallback of ["https://external.example/photo.jpg?v=2", url.replace("photo.jpeg", "tour.mp4")]) {
  const result = resolveMediaDelivery({ publicUrl: fallback }, "property-card");
  assert.equal(result.src, fallback);
  assert.equal(result.srcSet, "");
}
const { PropertyCoverImage } = loadSource(resolve("components/media/property-cover-image"));
const card = renderToStaticMarkup(createElement(PropertyCoverImage, { src: url, alt: "photo", className: "card", sizes: "360px" }));
assert.match(card, /srcSet=/);
assert.match(card, /sizes="360px"/);
assert.match(card, /loading="lazy"/);
assert.match(card, /resize=contain/);
const admin = renderToStaticMarkup(createElement(PropertyCoverImage, { src: url, alt: "photo", className: "admin" }));
assert.doesNotMatch(admin, /render\/image|srcSet=/, "admin preview is unchanged");

const media = (id: string, order: number, cover = false) => ({ id, sort_order: order, created_at: "2026-01-01", media_type: "image", url: url.replace("photo", id), is_cover: cover });
const property = { id: "property", slug: "property", title: "Photo", property_type: "land", property_media: [media("first", 0), media("cover", 3, true), { ...media("deleted", -1, true), deleted_at: "2026-01-01" }] };
for (const [file, name] of [["components/properties/property-card", "PropertyCard"], ["components/home/home-property-search", "HomePropertyCard"]]) {
  const component = loadSource(resolve(file))[name];
  const before = JSON.stringify(property);
  const html = renderToStaticMarkup(createElement(component, { property }));
  assert.match(html, /cover\.jpeg\?width=640&amp;quality=80&amp;resize=contain/);
  assert.doesNotMatch(html, /first\.jpeg|deleted\.jpeg/);
  assert.match(html, /srcSet=/); assert.match(html, /sizes=/);
  assert.equal(JSON.stringify(property), before, "rendering does not reorder/mutate property media");
  const videoCover = { ...property, property_media: [{ ...media("video", 0, true), media_type: "video", url: url.replace("photo.jpeg", "video.mp4"), thumbnail_url: url }] };
  const videoHtml = renderToStaticMarkup(createElement(component, { property: videoCover }));
  assert.match(videoHtml, /photo\.jpeg/); assert.doesNotMatch(videoHtml, /video\.mp4|<video/);
}
for (let active = 0; active < 6; active++) {
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => i).filter(i => shouldLoadHeroImage(i, active, 6)), [active, (active + 1) % 6].sort((a,b) => a-b));
}
assert.equal(shouldLoadHeroImage(0, 0, 0), false);
assert.equal(shouldLoadHeroImage(0, 0, 1), true);
assert.equal(shouldTransformHeroImage(url, 2 * 1024 * 1024), true);
assert.equal(shouldTransformHeroImage(url, 500_000), false);
assert.equal(shouldTransformHeroImage(url), false);
assert.equal(shouldTransformHeroImage("https://external.example/photo.jpg", 2_000_000), false);
assert.equal(shouldTransformHeroImage(url.replace("jpeg", "svg"), 2_000_000), false);
assert.equal(shouldTransformHeroImage(url.replace("jpeg", "mp4"), 2_000_000), false);
const { HomeCampaignCarousel } = loadSource(resolve("components/home/home-campaign-carousel"));
const campaigns = Array.from({length:6}, (_,i) => ({id:String(i),title:`slide-${i}`,media_public_url:url.replace("photo",`hero-${i}`),media_assets:{media_type:"image",file_size:2_000_000}}));
const hero = renderToStaticMarkup(createElement(HomeCampaignCarousel, { campaigns }));
assert.equal((hero.match(/<img\b/g) || []).length, 2);
assert.match(hero, /hero-0\.jpeg/); assert.match(hero, /hero-1\.jpeg/);
assert.doesNotMatch(hero, /hero-[2-5]\.jpeg/);
assert.match(hero, /fetchPriority="high"/); assert.match(hero, /resize=contain/);
assert.equal((hero.match(/data-home-campaign-slide=/g) || []).length, 6, "slide structure/order retained");
console.log("Property card and Hero media behavior: PASS");
