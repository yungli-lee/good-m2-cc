import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { placeMediaId, moveMediaId, validateMediaOrder } from "../lib/properties/media-order.ts";
import { resolvePropertyGallery } from "../lib/properties/media-gallery.ts";
import { getCoverMedia, getMediaImageUrl, sortPropertyMedia } from "../lib/properties/types.ts";
import type { PropertyMedia } from "../lib/properties/types.ts";

function media(id: string, mediaType: "image" | "video", options: Partial<PropertyMedia> = {}): PropertyMedia {
  return {
    id,
    property_id: "property-1",
    media_type: mediaType,
    mime_type: mediaType === "video" ? "video/mp4" : "image/jpeg",
    file_size: 1024,
    url: `https://example.test/${id}.${mediaType === "video" ? "mp4" : "jpg"}`,
    storage_path: `${id}.${mediaType === "video" ? "mp4" : "jpg"}`,
    thumbnail_url: mediaType === "video" ? `https://example.test/${id}-poster.jpg` : null,
    poster_storage_path: mediaType === "video" ? `${id}-poster.jpg` : null,
    alt_text: id,
    sort_order: 100,
    is_cover: false,
    created_at: "2026-08-26T00:00:00Z",
    updated_at: "2026-08-26T00:00:00Z",
    deleted_at: null,
    ...options
  };
}

const imageCover = media("image-cover", "image", { is_cover: true });
assert.equal(getCoverMedia({ property_media: [imageCover] }), imageCover, "an image can remain the cover");
assert.equal(getMediaImageUrl(imageCover), imageCover.url);

const videoCover = media("video-cover", "video", { is_cover: true, sort_order: 200 });
assert.equal(getCoverMedia({ property_media: [imageCover, videoCover] }), imageCover, "the single explicit cover remains canonical");
imageCover.is_cover = false;
assert.equal(getCoverMedia({ property_media: [imageCover, videoCover] }), videoCover, "a video with a Poster can be the cover");
assert.equal(getMediaImageUrl(videoCover), videoCover.thumbnail_url, "video cards and SEO use the Poster, not the video URL");

const posterlessVideo = media("posterless", "video", { is_cover: true, thumbnail_url: null, poster_storage_path: null, sort_order: 50 });
assert.equal(getCoverMedia({ property_media: [posterlessVideo, imageCover] }), imageCover, "a posterless video cannot become the visual cover");

const secondImage = media("second-image", "image", { sort_order: 300 });
const gallery = resolvePropertyGallery([secondImage, videoCover, imageCover]);
assert.equal(gallery.cover, videoCover, "the video cover is the main gallery item");
assert.deepEqual(gallery.detailMedia, [imageCover, secondImage], "the cover is not repeated below the main gallery");
assert.deepEqual(gallery.images, [imageCover, secondImage], "image lightbox navigation remains image-only");

const mixed = [media("late", "image", { sort_order: 300 }), media("early-video", "video", { sort_order: 100 }), media("middle", "image", { sort_order: 200 })];
assert.deepEqual(sortPropertyMedia(mixed).map((item) => item.id), ["early-video", "middle", "late"], "images and videos share sort_order");
assert.deepEqual(moveMediaId(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
assert.deepEqual(moveMediaId(["a", "b", "c"], "b", 1), ["a", "c", "b"]);
assert.deepEqual(moveMediaId(["a", "b", "c"], "a", -1), ["a", "b", "c"], "the first item cannot move up");
assert.deepEqual(moveMediaId(["a", "b", "c"], "c", 1), ["a", "b", "c"], "the last item cannot move down");
assert.deepEqual(placeMediaId(["image", "video", "image-2"], "video", "image"), ["video", "image", "image-2"], "dragging supports mixed media");

const rows = [
  { id: "a", property_id: "property-1", sort_order: 900, deleted_at: null },
  { id: "b", property_id: "property-1", sort_order: 100, deleted_at: null }
];
assert.deepEqual(validateMediaOrder(["b", "a"], rows, "property-1"), [{ id: "b", sort_order: 100 }, { id: "a", sort_order: 200 }]);
assert.equal(validateMediaOrder(["a", "a"], rows, "property-1"), null, "duplicate IDs are rejected");
assert.equal(validateMediaOrder(["a", "other"], rows, "property-1"), null, "IDs from another property are rejected");
assert.equal(validateMediaOrder(["a", "deleted"], [...rows, { id: "deleted", property_id: "property-1", sort_order: 300, deleted_at: "2026-08-26" }], "property-1"), null, "deleted media IDs are rejected");

const manager = readFileSync("components/admin/property-media-manager.tsx", "utf8");
const galleryComponent = readFileSync("components/media/property-media-gallery.tsx", "utf8");
const coverImage = readFileSync("components/media/property-cover-image.tsx", "utf8");
const coverRoute = readFileSync("app/admin/properties/[id]/edit/cover/route.ts", "utf8");
const reorderRoute = readFileSync("app/admin/properties/[id]/edit/media/reorder/route.ts", "utf8");
const queries = readFileSync("lib/properties/queries.ts", "utf8");
const propertyCard = readFileSync("components/properties/property-card.tsx", "utf8");
const homeSearch = readFileSync("components/home/home-property-search.tsx", "utf8");
const seo = readFileSync("lib/properties/seo.ts", "utf8");

assert.match(coverRoute, /media\.media_type === "video" && !media\.thumbnail_url\?\.trim\(\)/, "posterless videos are rejected by the cover endpoint");
assert.match(coverRoute, /previousCover\?\.id/, "cover failure restores the prior cover");
assert.doesNotMatch(coverRoute, /update\(\{[^}]*sort_order/, "setting a cover does not alter sort_order");
assert.match(galleryComponent, /cover\?\.media_type === "video"/);
assert.match(galleryComponent, /onPlay=\{\(\) => openVideo\(cover\)\}/, "clicking the video cover opens VideoLightbox");
assert.match(galleryComponent, /onClick=\{\(\) => openImage\(cover\)\}/, "clicking an image cover opens ImageLightbox");
assert.match(galleryComponent, /<VideoLightbox/);
assert.match(galleryComponent, /<ImageLightbox/);
assert.match(coverImage, /onError=\{\(\) => setFailed\(true\)\}/, "failed Poster images use the safe visual fallback");
assert.match(propertyCard, /getMediaImageUrl\(cover\)/, "property lists use the shared Poster-aware cover URL");
assert.match(homeSearch, /media\?\.media_type === "video" \? media\.thumbnail_url/, "homepage search cards use the Poster");
assert.match(seo, /ogImage: getMediaImageUrl\(cover\)/, "SEO and Open Graph use the Poster for a video cover");

assert.match(manager, /draggable=\{orderStatus !== "saving"\}/, "desktop sorting has a dedicated drag handle");
assert.match(manager, />上移<\/button>/);
assert.match(manager, />下移<\/button>/);
assert.match(manager, /index === 0 \|\| orderStatus === "saving"/, "the first move-up button is disabled");
assert.match(manager, /index === orderedMedia\.length - 1 \|\| orderStatus === "saving"/, "the last move-down button is disabled");
assert.match(manager, /setOrderedMedia\(previous\)/, "failed saves restore the previous frontend order");
assert.match(manager, /正在儲存排序…/);
assert.match(manager, /排序已儲存/);
assert.match(manager, /排序儲存失敗，已恢復原順序/);
assert.match(manager, /type="button"[\s\S]*draggable=/, "dragging is isolated from submit actions");

assert.match(reorderRoute, /canManagePropertyMedia\(current\.profile\.role\)/, "unauthorized roles are rejected");
assert.match(reorderRoute, /validateMediaOrder\(body\.ordered_ids, rows \|\| \[\], propertyId\)/);
assert.match(reorderRoute, /\.eq\("property_id", propertyId\)[\s\S]*\.is\("deleted_at", null\)/, "updates stay scoped to active media for the route property");
assert.match(reorderRoute, /sort_order: previous\.sort_order/, "partial update failure rolls back original sort values");
assert.doesNotMatch(reorderRoute, /update\(\{[^}]*is_cover/, "sorting does not change is_cover");
assert.match(queries, /media_type,[\s\S]*thumbnail_url,[\s\S]*sort_order,[\s\S]*is_cover,[\s\S]*created_at,[\s\S]*deleted_at/);
assert.match(queries, /referencedTable: "property_media", ascending: true/, "embedded media queries request stable ordering");

console.log("Property media cover and reorder tests: PASS");
