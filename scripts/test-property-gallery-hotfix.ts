import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isSameMedia, normalizeMediaUrl, resolvePropertyGallery } from "../lib/properties/media-gallery.ts";
import type { PropertyMedia } from "../lib/properties/types.ts";

function image(id: string, url: string, options: Partial<PropertyMedia> = {}): PropertyMedia {
  return {
    id,
    property_id: "property-1",
    media_type: "image",
    mime_type: "image/jpeg",
    file_size: null,
    url,
    storage_path: null,
    thumbnail_url: null,
    poster_storage_path: null,
    alt_text: null,
    sort_order: 0,
    is_cover: false,
    created_at: "2026-08-07T00:00:00Z",
    updated_at: "2026-08-07T00:00:00Z",
    deleted_at: null,
    ...options
  };
}

const a = image("a", "https://example.test/a.jpg", { is_cover: true });
const b = image("b", "https://example.test/b.jpg");
const c = image("c", "https://example.test/c.jpg");

let gallery = resolvePropertyGallery([b, a, c]);
assert.equal(gallery.cover, a, "explicit cover wins without assuming the first item");
assert.deepEqual(gallery.detailMedia, [b, c], "cover is excluded without changing detail order");
assert.deepEqual(gallery.images, [a, b, c], "the lightbox starts with the canonical cover and keeps remaining order stable");

gallery = resolvePropertyGallery([a]);
assert.equal(gallery.cover, a);
assert.deepEqual(gallery.detailMedia, [], "one-photo properties do not render a duplicate detail gallery");

gallery = resolvePropertyGallery([b, c]);
assert.equal(gallery.cover, b, "missing explicit cover uses the existing first-image fallback");
assert.deepEqual(gallery.detailMedia, [c]);

const duplicateCover = image("a", "https://cdn.test/different.jpg");
gallery = resolvePropertyGallery([a, duplicateCover, b]);
assert.deepEqual(gallery.detailMedia, [b], "stable media ID prevents duplicate cover rendering");
assert.deepEqual(gallery.images, [a, b], "duplicate cover identity is also omitted from lightbox navigation");

const urlOnlyCover = image("", " https://example.test/a.jpg#preview ", { is_cover: true });
const urlOnlyDuplicate = image("", "https://example.test/a.jpg");
assert.equal(normalizeMediaUrl(urlOnlyCover.url), normalizeMediaUrl(urlOnlyDuplicate.url));
assert.equal(isSameMedia(urlOnlyCover, urlOnlyDuplicate), true, "normalized URL is the fallback when stable IDs are absent");
assert.deepEqual(resolvePropertyGallery([urlOnlyCover, urlOnlyDuplicate, b]).detailMedia, [b]);

const deleted = image("deleted", "https://example.test/deleted.jpg", { deleted_at: "2026-08-07T00:00:00Z" });
const broken = image("broken", "   ");
gallery = resolvePropertyGallery([deleted, broken, b]);
assert.equal(gallery.cover, b, "deleted and unusable media do not break cover fallback");

const component = readFileSync("components/media/property-media-gallery.tsx", "utf8");
const lightbox = readFileSync("components/media/image-lightbox.tsx", "utf8");
assert.match(component, /<ImageLightbox images=\{images\}/, "cover remains in the lightbox collection");
assert.match(component, /detailMedia\.length \? <div className="media-grid">/, "empty detail galleries are omitted");
assert.equal((component.match(/trackEvent\("view_property_media"/g) || []).length, 2, "image and video opens keep one existing event each");
assert.match(lightbox, /event\.key === "Escape"/);
assert.match(lightbox, /event\.key === "ArrowLeft"/);
assert.match(lightbox, /event\.key === "ArrowRight"/);
assert.match(lightbox, /images\.length > 1 \?/);
assert.match(lightbox, /event\.target === event\.currentTarget/);
assert.match(lightbox, /document\.body\.style\.overflow = "hidden"/);
assert.match(lightbox, /previousFocusRef\.current\?\.focus\(\)/);

console.log("property gallery hotfix tests passed");
