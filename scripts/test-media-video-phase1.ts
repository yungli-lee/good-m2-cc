import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeSlideDurationMs } from "../lib/media/playback.ts";
import { validateMediaFile, validateMediaUpload } from "../lib/media/upload.ts";
import { activateHomeCarouselVideo, deactivateHomeCarouselVideo, type HomeCarouselVideoElement } from "../lib/media/home-carousel-video.ts";

assert.equal(homeSlideDurationMs("video"), 30_000, "a 45-second uploaded video advances at 30 seconds");
assert.equal(homeSlideDurationMs("image"), 5_000);
assert.equal(homeSlideDurationMs("image", 17), 17_000);
assert.equal(homeSlideDurationMs("image", 2), 5_000);
assert.equal(homeSlideDurationMs("image", 45), 30_000);

const mb = 1024 * 1024;
assert.equal(validateMediaUpload({ name: "video.mp4", type: "video/mp4", size: 30 * mb }, "homepage").ok, true);
assert.equal(validateMediaUpload({ name: "video.webm", type: "video/webm", size: 30 * mb }, "homepage").ok, true);
assert.equal(validateMediaUpload({ name: "video.mov", type: "video/quicktime", size: mb }, "homepage").ok, false);
assert.equal(validateMediaUpload({ name: "fake.jpg", type: "video/mp4", size: mb }, "homepage").ok, false);
assert.equal(validateMediaUpload({ name: "fake.mp4", type: "image/jpeg", size: mb }, "homepage").ok, false);
assert.equal(validateMediaUpload({ name: "fake.webm", type: "video/mp4", size: mb }, "homepage").ok, false);
assert.equal(validateMediaUpload({ name: "video.mp4", type: "application/octet-stream", size: mb }, "homepage").ok, false);
assert.equal(validateMediaUpload({ name: "video.mp4", type: "video/mp4", size: 30 * mb + 1 }, "homepage").ok, false);
assert.equal(validateMediaUpload({ name: "video.mp4", type: "video/mp4", size: 50 * mb }, "property").ok, true);
assert.equal(validateMediaUpload({ name: "video.mp4", type: "video/mp4", size: 100 * mb + 1 }, "property").ok, false);
assert.equal(validateMediaUpload({ name: "poster.jpg", type: "image/jpeg", size: 5 * mb }, "poster").ok, true);
assert.equal(validateMediaUpload({ name: "poster.mp4", type: "video/mp4", size: mb }, "poster").ok, false);

function uploadFile(name: string, type: string, bytes: number[]) {
  const blob = new Blob([new Uint8Array(bytes)], { type });
  return { name, type, size: blob.size, slice: (start?: number, end?: number) => blob.slice(start, end) };
}

const mp4Bytes = [0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0];
const movBytes = [0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20, 0, 0, 0, 0];
const webmBytes = [0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d];
assert.equal((await validateMediaFile(uploadFile("video.mp4", "video/mp4", mp4Bytes), "homepage")).ok, true);
assert.equal((await validateMediaFile(uploadFile("video.webm", "video/webm", webmBytes), "homepage")).ok, true);
assert.equal((await validateMediaFile(uploadFile("fake.mp4", "video/mp4", [1, 2, 3, 4]), "homepage")).ok, false);
assert.equal((await validateMediaFile(uploadFile("renamed.jpg", "image/jpeg", mp4Bytes), "homepage")).ok, false);
assert.equal((await validateMediaFile(uploadFile("quicktime.mp4", "video/mp4", movBytes), "homepage")).ok, false);

const root = new URL("../", import.meta.url);
const homeRender = readFileSync(new URL("components/home/home-campaign-carousel.tsx", root), "utf8");
const homeVideoLifecycle = readFileSync(new URL("lib/media/home-carousel-video.ts", root), "utf8");
const lightbox = readFileSync(new URL("components/media/video-lightbox.tsx", root), "utf8");
const propertyGallery = readFileSync(new URL("components/media/property-media-gallery.tsx", root), "utf8");
const propertySeo = readFileSync(new URL("lib/properties/types.ts", root), "utf8");
const mediaUploadRoute = readFileSync(new URL("app/api/admin/media/route.ts", root), "utf8");
const mediaDeleteRoute = readFileSync(new URL("app/api/admin/media/[id]/route.ts", root), "utf8");
const propertyUploadRoute = readFileSync(new URL("app/admin/properties/[id]/edit/upload/route.ts", root), "utf8");
const propertyDeleteRoute = readFileSync(new URL("app/admin/properties/[id]/edit/media/[mediaId]/delete/route.ts", root), "utf8");
const migration = readFileSync(new URL("supabase/migrations/202608020101_media_library_video_phase_1.sql", root), "utf8");

assert.match(homeRender, /preload=\{index === active \? "metadata" : "none"\}/);
assert.match(homeRender, /data-video-src=/, "the initially active video keeps a reusable source for later rounds");
assert.match(homeRender, /data-video-src=\{src\}/);
assert.match(homeRender, /preload=\{index === active \? "metadata" : "none"\}/);
assert.doesNotMatch(homeRender, /video\/quicktime|\.mov/);
assert.match(homeRender, /播放完整版/);
assert.match(homeRender, /home-campaign-video-slide/, "video slides expose a mobile-only framing hook");
assert.match(homeRender, /visibilitychange/);
assert.match(homeRender, /index !== active \|\| lightbox/, "opening the lightbox fully deactivates its background video");
assert.match(homeVideoLifecycle, /removeAttribute\("src"\)/);
assert.match(homeRender, /5_000/);
assert.match(homeRender, /prefers-reduced-motion: reduce/);
assert.match(homeRender, /slide_duration_seconds/);
assert.match(lightbox, /controls playsInline/);
assert.match(lightbox, /event\.key === "Escape"/);
assert.match(lightbox, /event\.target === event\.currentTarget/);
assert.match(propertyGallery, /VideoLightbox/);
assert.doesNotMatch(propertyGallery, /<video/);
assert.match(propertySeo, /item\.media_type === "image"/, "cover and OG selection stays image-only");
assert.match(mediaUploadRoute, /影片必須上傳 poster 圖片/);
assert.match(mediaUploadRoute, /poster_storage_path/);
assert.match(mediaUploadRoute, /remove\(\[storagePath, posterStoragePath\]/, "DB failure cleans both uploaded objects");
assert.match(mediaDeleteRoute, /before\.poster_storage_path/);
assert.match(propertyUploadRoute, /video_poster_required/);
assert.match(propertyUploadRoute, /poster_storage_path/);
assert.match(propertyDeleteRoute, /before\.poster_storage_path/);
assert.match(migration, /add column if not exists poster_url text/);
assert.match(migration, /video\/mp4/);
assert.match(migration, /video\/webm/);
assert.doesNotMatch(migration, /video\/quicktime|\.mov/);
assert.match(migration, /slide_duration_seconds integer not null default 5/);
assert.match(migration, /slide_duration_seconds between 5 and 30/);

class FakeVideo implements HomeCarouselVideoElement {
  currentTime = 18;
  dataset = { videoSrc: "https://example.test/video.mp4" };
  hidden = true;
  preload = "none";
  readyState = 0;
  attributes = new Map<string, string>();
  listeners = new Map<string, () => void>();
  loadCalls = 0;
  pauseCalls = 0;
  playCalls = 0;
  rejectPlay = false;
  addEventListener(type: string, listener: () => void) { this.listeners.set(type, listener); }
  removeEventListener(type: string, listener: () => void) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  getAttribute(name: string) { return this.attributes.get(name) || null; }
  load() { this.loadCalls += 1; this.readyState = 0; }
  pause() { this.pauseCalls += 1; }
  play() { this.playCalls += 1; return this.rejectPlay ? Promise.reject(new Error("autoplay blocked")) : Promise.resolve(); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  dispatch(type: string) { this.listeners.get(type)?.(); }
}

const carouselVideo = new FakeVideo();
assert.equal(activateHomeCarouselVideo(carouselVideo), true);
assert.equal(carouselVideo.getAttribute("src"), carouselVideo.dataset.videoSrc);
assert.equal(carouselVideo.currentTime, 0);
carouselVideo.dispatch("canplay");
assert.equal(carouselVideo.playCalls, 1, "the first activation plays once ready");
deactivateHomeCarouselVideo(carouselVideo);
assert.equal(carouselVideo.pauseCalls >= 1, true);
assert.equal(carouselVideo.getAttribute("src"), null, "inactive video releases its source");
assert.equal(carouselVideo.preload, "none");
assert.equal(activateHomeCarouselVideo(carouselVideo), true);
assert.equal(carouselVideo.getAttribute("src"), carouselVideo.dataset.videoSrc, "the second activation restores the source");
assert.equal(carouselVideo.currentTime, 0, "the second activation rewinds the video");
carouselVideo.dispatch("canplay");
assert.equal(carouselVideo.playCalls, 2, "the second activation plays again");
deactivateHomeCarouselVideo(carouselVideo);
assert.equal(activateHomeCarouselVideo(carouselVideo), true);
carouselVideo.dispatch("canplay");
assert.equal(carouselVideo.playCalls, 3, "ended or timed-out slides can play on the third activation");

let rejected = 0;
carouselVideo.rejectPlay = true;
deactivateHomeCarouselVideo(carouselVideo);
activateHomeCarouselVideo(carouselVideo, { onPlayRejected: () => { rejected += 1; } });
carouselVideo.dispatch("canplay");
await Promise.resolve();
await Promise.resolve();
assert.equal(rejected, 1);
carouselVideo.rejectPlay = false;
deactivateHomeCarouselVideo(carouselVideo);
activateHomeCarouselVideo(carouselVideo);
carouselVideo.dispatch("canplay");
assert.equal(carouselVideo.playCalls, 5, "a rejected autoplay attempt does not permanently lock the slide");

const globalCss = readFileSync(new URL("app/globals.css", root), "utf8");
assert.match(globalCss, /hero\.home-campaign-carousel \{ min-height: clamp\(400px, 108vw, 440px\); \}/);
assert.match(globalCss, /home-campaign-video-slide \.hero-media \{[\s\S]*aspect-ratio: 16 \/ 9;/);
assert.match(globalCss, /home-campaign-slide \.hero-media video,[\s\S]*home-video-fallback img \{ object-position: center center; \}/);
assert.match(globalCss, /home-video-full-button \{ top: 76px; bottom: auto; max-width: calc\(100vw - 40px\); \}/);

console.log("Media Library Video Phase 1 tests: PASS");
