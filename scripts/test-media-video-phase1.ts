import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeSlideDurationMs } from "../lib/media/playback.ts";
import { validateMediaFile, validateMediaUpload } from "../lib/media/upload.ts";
import { buildFileSelection } from "../lib/media/file-selection.ts";
import { activateHomeCarouselVideo, deactivateHomeCarouselVideo, isActiveHomeCarouselVideoFailure, type HomeCarouselVideoElement } from "../lib/media/home-carousel-video.ts";

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

type TestFile = { name: string; type: string; size: number };

function fakeFileList(files: TestFile[]) {
  return Object.assign(files, { item: (index: number) => files[index] || null }) as unknown as FileList;
}

function fakeTransfer() {
  const files: TestFile[] = [];
  return {
    files: fakeFileList(files),
    items: { add: (file: File) => { files.push(file as unknown as TestFile); return null; } }
  } as unknown as DataTransfer;
}

const photo = { name: "living-room.jpg", type: "image/jpeg", size: mb } as File;
const video = { name: "tour.mp4", type: "video/mp4", size: 10 * mb } as File;
const secondPhoto = { name: "kitchen.webp", type: "image/webp", size: mb } as File;
const largeVideo = { name: "large-tour.webm", type: "video/webm", size: 20 * mb + 1 } as File;

const firstPhotoInput = fakeFileList([photo]);
const firstPhotoSelection = buildFileSelection([], firstPhotoInput, "input", () => {
  throw new Error("the first native input selection must not create a DataTransfer");
});
assert.equal(firstPhotoSelection.shouldReplaceInputFiles, false, "the first native image selection keeps the browser-owned input.files");
assert.equal(firstPhotoSelection.fileList, firstPhotoInput);
assert.deepEqual(firstPhotoSelection.files, [photo]);
assert.deepEqual(firstPhotoSelection.fileNames, Array.from(firstPhotoSelection.fileList).map((file) => file.name));

const firstVideoInput = fakeFileList([video]);
const firstVideoSelection = buildFileSelection([], firstVideoInput, "input", () => {
  throw new Error("the first native input selection must not create a DataTransfer");
});
assert.equal(firstVideoSelection.shouldReplaceInputFiles, false, "the first native MP4 selection keeps the browser-owned input.files");
assert.equal(firstVideoSelection.fileList, firstVideoInput);
assert.deepEqual(firstVideoSelection.files, [video]);

const appendedSelection = buildFileSelection(firstPhotoSelection.files, fakeFileList([secondPhoto]), "input", fakeTransfer);
assert.equal(appendedSelection.shouldReplaceInputFiles, true, "a later native selection replaces input.files with the merged FileList");
assert.deepEqual(appendedSelection.fileNames, [photo.name, secondPhoto.name], "a later selection keeps the previous file and adds the new file");
assert.deepEqual(appendedSelection.fileNames, Array.from(appendedSelection.fileList).map((file) => file.name));

const droppedSelection = buildFileSelection(appendedSelection.files, fakeFileList([video]), "drop", fakeTransfer);
assert.equal(droppedSelection.shouldReplaceInputFiles, true, "a drop replaces input.files so the form submits all selected files");
assert.deepEqual(droppedSelection.fileNames, [photo.name, secondPhoto.name, video.name], "dropped files are appended to the selection");
assert.equal(droppedSelection.hasLargeVideo, false);
const firstDropSelection = buildFileSelection([], fakeFileList([photo]), "drop", fakeTransfer);
assert.equal(firstDropSelection.shouldReplaceInputFiles, true, "even a first drop populates the real file input");
assert.equal(buildFileSelection([], fakeFileList([largeVideo]), "input", fakeTransfer).hasLargeVideo, true, "videos over 20MB keep the existing warning");

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
const propertyMediaManager = readFileSync(new URL("components/admin/property-media-manager.tsx", root), "utf8");
const propertyEditPage = readFileSync(new URL("app/admin/properties/[id]/edit/page.tsx", root), "utf8");
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
assert.match(homeRender, /isActiveHomeCarouselVideoFailure/, "React restores the legacy active-slide failure guard");
assert.match(homeVideoLifecycle, /removeAttribute\("src"\)/);
assert.match(homeRender, /5_000/);
assert.match(homeRender, /prefers-reduced-motion: reduce/);
assert.match(homeRender, /slide_duration_seconds/);
assert.match(lightbox, /controls playsInline/);
assert.match(lightbox, /event\.key === "Escape"/);
assert.match(lightbox, /event\.target === event\.currentTarget/);
assert.match(propertyGallery, /VideoLightbox/);
assert.doesNotMatch(propertyGallery, /<video/);
assert.match(propertySeo, /media\.media_type === "video" \? media\.thumbnail_url : media\.url/, "video covers use their Poster for cards and OG images");
assert.match(mediaUploadRoute, /影片必須上傳 poster 圖片/);
assert.match(mediaUploadRoute, /poster_storage_path/);
assert.match(mediaUploadRoute, /remove\(\[storagePath, posterStoragePath\]/, "DB failure cleans both uploaded objects");
assert.match(mediaDeleteRoute, /before\.poster_storage_path/);
assert.match(propertyUploadRoute, /video_poster_required/);
assert.match(propertyUploadRoute, /poster_storage_path/);
assert.match(propertyMediaManager, /accept="image\/jpeg,image\/png,image\/webp,video\/mp4,video\/webm"/);
assert.match(propertyMediaManager, /name="poster" type="file" accept="image\/jpeg,image\/png,image\/webp"/);
assert.match(propertyEditPage, /video_poster_required/);
assert.match(propertyEditPage, /poster_upload_failed/);
assert.match(propertyEditPage, /media_url_failed/);
assert.doesNotMatch(propertyEditPage, /操作失敗：\$\{query\.error\}/, "internal error codes are not shown to users");
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
assert.equal(isActiveHomeCarouselVideoFailure(carouselVideo, 0, 0), true, "a real failure from the active sourced video is handled");
assert.equal(carouselVideo.getAttribute("src"), carouselVideo.dataset.videoSrc);
assert.equal(carouselVideo.currentTime, 0);
carouselVideo.dispatch("canplay");
assert.equal(carouselVideo.playCalls, 1, "the first activation plays once ready");
deactivateHomeCarouselVideo(carouselVideo);
assert.equal(isActiveHomeCarouselVideoFailure(carouselVideo, 0, 1), false, "the expected abort while leaving a slide is ignored");
assert.equal(isActiveHomeCarouselVideoFailure(carouselVideo, 0, 0), false, "a source-clearing lifecycle event cannot replace the video with fallback");
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
