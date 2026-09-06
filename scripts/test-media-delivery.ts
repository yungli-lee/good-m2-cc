import assert from "node:assert/strict";
import {
  buildSupabasePublicUrl,
  buildSupabaseTransformedUrl,
  mediaImageWidths,
  mediaTierPolicies,
  parseSupabasePublicUrl,
  resolveMediaDelivery
} from "../lib/media/delivery.ts";

const origin = "https://project-ref.supabase.co";
const rawUrl = `${origin}/storage/v1/object/public/media/editor-id/general/2026/08/image name.png`;
const encodedRawUrl = `${origin}/storage/v1/object/public/media/editor-id/general/2026/08/image%20name.png`;

assert.deepEqual(mediaImageWidths, [384, 640, 960, 1280, 1600, 2048, 2560]);
assert.deepEqual(mediaTierPolicies.card.widths, [384, 640, 960]);
assert.equal(mediaTierPolicies.card.quality, 75);
assert.equal(mediaTierPolicies.detail.defaultWidth, 1280);
assert.equal(mediaTierPolicies.detail.quality, 82);
assert.deepEqual(mediaTierPolicies.fullscreen.widths, [1280, 1600, 2048]);
assert.equal(mediaTierPolicies.fullscreen.quality, 86);
assert.equal(mediaTierPolicies.original.format, "original");

assert.deepEqual(parseSupabasePublicUrl(encodedRawUrl), {
  bucket: "media",
  storagePath: "editor-id/general/2026/08/image name.png",
  origin,
  query: ""
});
assert.equal(parseSupabasePublicUrl("not a url"), null);
assert.equal(parseSupabasePublicUrl("https://example.com/storage/v1/object/public/media/image.png"), null);
assert.equal(parseSupabasePublicUrl(`${origin}/storage/v1/render/image/public/media/image.png`), null);
assert.equal(parseSupabasePublicUrl(`${origin}/storage/v1/object/public/media`), null);

const unicodeUrl = `${origin}/storage/v1/object/public/media/%E7%9F%A5%E8%AD%98/%E6%88%BF%E5%B1%8B%20%E7%A8%85.png`;
assert.deepEqual(parseSupabasePublicUrl(unicodeUrl)?.storagePath, "知識/房屋 稅.png");
assert.equal(
  buildSupabaseTransformedUrl(unicodeUrl, 384, 75),
  `${origin}/storage/v1/render/image/public/media/%E7%9F%A5%E8%AD%98/%E6%88%BF%E5%B1%8B%20%E7%A8%85.png?width=384&quality=75`
);

const encodedSegmentUrl = `${origin}/storage/v1/object/public/media/literal%2520name.png`;
assert.equal(parseSupabasePublicUrl(encodedSegmentUrl)?.storagePath, "literal%20name.png");
assert.equal(
  buildSupabaseTransformedUrl(encodedSegmentUrl, 384, 75),
  `${origin}/storage/v1/render/image/public/media/literal%2520name.png?width=384&quality=75`,
  "already encoded path data is not double-decoded or double-encoded"
);

assert.equal(
  buildSupabasePublicUrl(`${origin}/ignored/path`, "property-media", "owner/listing/front room.jpg"),
  `${origin}/storage/v1/object/public/property-media/owner/listing/front%20room.jpg`
);

const transformed = buildSupabaseTransformedUrl(encodedRawUrl, 640, 75);
assert.equal(
  transformed,
  `${origin}/storage/v1/render/image/public/media/editor-id/general/2026/08/image%20name.png?width=640&quality=75`
);

const withQuery = buildSupabaseTransformedUrl(`${encodedRawUrl}?cacheNonce=7&width=999&quality=20`, 960, 82);
const withQueryUrl = new URL(withQuery);
assert.equal(withQueryUrl.pathname, "/storage/v1/render/image/public/media/editor-id/general/2026/08/image%20name.png");
assert.equal(withQueryUrl.searchParams.get("cacheNonce"), "7", "legacy query parameters are preserved");
assert.equal(withQueryUrl.searchParams.get("width"), "960", "fixed transform width replaces legacy values");
assert.equal(withQueryUrl.searchParams.get("quality"), "82", "tier quality replaces legacy values");

const canonicalCard = resolveMediaDelivery({
  bucket: "media",
  storagePath: "owner/general/photo.png",
  supabaseUrl: origin
}, "card");
assert.equal(canonicalCard.provider, "supabase");
assert.equal(canonicalCard.src, `${origin}/storage/v1/render/image/public/media/owner/general/photo.png?width=640&quality=75`);
assert.deepEqual(canonicalCard.widths, [384, 640, 960]);
assert.match(canonicalCard.srcSet, /width=384&quality=75 384w/);
assert.match(canonicalCard.srcSet, /width=960&quality=75 960w/);
assert.doesNotMatch(canonicalCard.srcSet, /2560w/, "card output is restricted to its fixed tier widths");

const legacyDetail = resolveMediaDelivery({ publicUrl: encodedRawUrl }, "detail");
assert.equal(legacyDetail.provider, "supabase");
assert.equal(legacyDetail.bucket, "media");
assert.equal(legacyDetail.storagePath, "editor-id/general/2026/08/image name.png");
assert.deepEqual(legacyDetail.widths, [640, 960, 1280, 1600]);
assert.equal(legacyDetail.src, `${origin}/storage/v1/render/image/public/media/editor-id/general/2026/08/image%20name.png?width=1280&quality=82`);

const fullscreen = resolveMediaDelivery({ publicUrl: encodedRawUrl }, "fullscreen");
assert.deepEqual(fullscreen.widths, [1280, 1600, 2048]);
assert.doesNotMatch(fullscreen.srcSet, /2560w/, "Supabase never receives its unsupported 2560 transform");

const original = resolveMediaDelivery({ publicUrl: `${encodedRawUrl}?download=1` }, "original");
assert.equal(original.src, `${encodedRawUrl}?download=1`);
assert.equal(original.originalUrl, `${encodedRawUrl}?download=1`);
assert.equal(original.srcSet, "");
assert.deepEqual(original.widths, []);

const external = resolveMediaDelivery({ publicUrl: "https://media.example.com/listing/image.jpg?version=2" }, "card");
assert.equal(external.provider, "external");
assert.equal(external.src, "https://media.example.com/listing/image.jpg?version=2");
assert.equal(external.originalUrl, external.src);
assert.equal(external.srcSet, "", "unknown providers preserve the original instead of fabricating transforms");

const videoUrl = `${origin}/storage/v1/object/public/property-media/owner/tour.mp4?version=2`;
const video = resolveMediaDelivery({ publicUrl: videoUrl }, "card");
assert.equal(video.provider, "supabase");
assert.equal(video.src, videoUrl, "Supabase-hosted video remains unchanged");
assert.equal(video.srcSet, "", "video never receives image transformation candidates");
assert.equal(buildSupabaseTransformedUrl(videoUrl, 640, 75), videoUrl);

const canonicalFallback = resolveMediaDelivery({
  bucket: "media",
  storagePath: "owner/photo.png",
  publicUrl: "https://legacy.example.com/photo.png"
}, "card");
assert.equal(canonicalFallback.src, "https://legacy.example.com/photo.png", "missing provider origin preserves the legacy original");
assert.equal(canonicalFallback.srcSet, "");

const empty = resolveMediaDelivery({}, "card");
assert.equal(empty.provider, "unknown");
assert.equal(empty.src, "");

// Compile-time calls only accept MediaImageWidth; the runtime guard also fails closed.
assert.equal(buildSupabaseTransformedUrl(rawUrl, 777 as never, 75), rawUrl);

console.log("Media delivery foundation tests: PASS");
