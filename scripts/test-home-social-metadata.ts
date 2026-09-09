import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { buildHomeSocialStoragePath, readJpegDimensions } from "../lib/home-social-image.ts";
import { resolveHomeSocialImage } from "../lib/home-social-metadata.ts";

const root = process.cwd();
const page = readFileSync(resolve(root, "app/page.tsx"), "utf8");
const imagePath = resolve(root, "public/images/social/home-og.jpg");
const image = readFileSync(imagePath);

const title = "阿勇不動產顧問｜彰化房地產資訊與服務";
const description = "提供彰化地區房屋、土地、農地與廠房資訊，專業、用心、誠信協助您安心買賣。";
const url = "https://good.m2.cc/";
const imageUrl = "https://good.m2.cc/images/social/home-og.jpg";
const supabaseOrigin = "https://project-ref.supabase.co";
const uuid = "550e8400-e29b-41d4-a716-446655440000";
const upperUuid = "550E8400-E29B-41D4-A716-446655440000";
const objectPath = `home-social/home-og-${uuid}.jpg`;
const cmsImage = `${supabaseOrigin}/storage/v1/object/public/media/${objectPath}`;

async function resolved(value: unknown) {
  return resolveHomeSocialImage({ load: async () => value, supabaseOrigin });
}

assert.match(page, /export async function generateMetadata\(\): Promise<Metadata>/, "homepage metadata must be server-generated");
for (const value of [title, description, url]) assert.ok(page.includes(JSON.stringify(value)), `homepage metadata must include ${value}`);
assert.match(page, /resolveHomeSocialImage/);
assert.match(page, /getCachedHomeSocialImageUrl/);
assert.match(page, /type:\s*"website"/);
assert.match(page, /locale:\s*"zh_TW"/);
assert.match(page, /siteName:\s*"阿勇不動產顧問"/);
assert.match(page, /card:\s*"summary_large_image"/);
assert.match(page, /width:\s*1200/);
assert.match(page, /height:\s*630/);

assert.equal(image[0], 0xff, "social image must be JPEG");
assert.equal(image[1], 0xd8, "social image must be JPEG");
assert.ok(statSync(imagePath).size < 500_000, "social image must remain below 500 KB");

let offset = 2;
let dimensions: [number, number] | null = null;
let colorComponents: number | null = null;
while (offset + 9 < image.length) {
  if (image[offset] !== 0xff) { offset += 1; continue; }
  const marker = image[offset + 1];
  if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
  const length = image.readUInt16BE(offset + 2);
  if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
    dimensions = [image.readUInt16BE(offset + 7), image.readUInt16BE(offset + 5)];
    colorComponents = image[offset + 9];
    break;
  }
  offset += 2 + length;
}
assert.deepEqual(dimensions, [1200, 630], "social image must be exactly 1200×630");
assert.deepEqual(readJpegDimensions(image), { width: 1200, height: 630 });
assert.equal(colorComponents, 3, "fallback JPEG must use three color components (RGB/YUV, not grayscale or CMYK)");

assert.equal(await resolved(null), imageUrl, "NULL URL and path must use fallback");
assert.equal(await resolved({ url: cmsImage, path: null }), imageUrl, "URL without path must be rejected");
assert.equal(await resolved({ url: null, path: objectPath }), imageUrl, "path without URL must be rejected");
assert.equal(await resolveHomeSocialImage({ load: async () => { throw new Error("db unavailable"); }, supabaseOrigin }), imageUrl, "CMS failure must use fallback");
assert.equal(await resolved("javascript:alert(1)"), imageUrl, "invalid CMS URL must use fallback");
assert.equal(await resolved({ url: cmsImage, path: objectPath }), cmsImage, "valid UUID path and matching HTTPS URL must be used");
const upperPath = `home-social/home-og-${upperUuid}.jpg`;
assert.equal(await resolved({ url: `${supabaseOrigin}/storage/v1/object/public/media/${upperPath}`, path: upperPath }), `${supabaseOrigin}/storage/v1/object/public/media/${upperPath}`, "uppercase UUID hex must be accepted");

for (const [name, value] of [
  ["non-UUID path", { url: `${supabaseOrigin}/storage/v1/object/public/media/home-social/home-og-test.jpg`, path: "home-social/home-og-test.jpg" }],
  ["HTTP URL", { url: cmsImage.replace("https://", "http://"), path: objectPath }],
  ["wrong bucket", { url: cmsImage.replace("/media/", "/other/"), path: objectPath }],
  ["different UUID", { url: cmsImage, path: "home-social/home-og-123e4567-e89b-42d3-a456-426614174000.jpg" }],
  ["query string", { url: `${cmsImage}?v=1`, path: objectPath }],
  ["fragment", { url: `${cmsImage}#preview`, path: objectPath }],
  ["non-JPG", { url: cmsImage.replace(/\.jpg$/, ".png"), path: objectPath.replace(/\.jpg$/, ".png") }],
  ["extra subdirectory", { url: cmsImage.replace("/home-og-", "/nested/home-og-"), path: objectPath.replace("home-og-", "nested/home-og-") }],
  ["external host", { url: cmsImage.replace("project-ref.supabase.co", "external.example"), path: objectPath }]
] as const) {
  assert.equal(await resolved(value), imageUrl, `${name} must be rejected`);
}

assert.equal(await resolveHomeSocialImage({ load: () => new Promise(() => {}), timeoutMs: 1, supabaseOrigin }), imageUrl, "CMS timeout must use fallback");
assert.equal(buildHomeSocialStoragePath(uuid), objectPath, "uploads must use versioned UUID paths");

const migration = readFileSync(resolve(root, "supabase/migrations/202609090101_home_social_image_setting.sql"), "utf8");
assert.match(migration, /home_social_image_url is null\s+and home_social_image_path is null/);
assert.match(migration, /home_social_image_url is not null\s+and home_social_image_path is not null/);
assert.match(migration, /\[0-9a-fA-F\]\{8\}.*\[1-5\]\[0-9a-fA-F\]\{3\}.*\[89aAbB\]\[0-9a-fA-F\]\{3\}/s, "constraint must require an RFC 4122 UUID");
assert.match(migration, /\^https:\/\/\[\^\/\]\+\/storage\/v1\/object\/public\/media\/home-social\/home-og-/, "constraint must require the public media URL shape");
assert.match(migration, /right\([\s\S]*home_social_image_url[\s\S]*home_social_image_path[\s\S]*\)/, "constraint must require URL/path correspondence");

const uploadRoute = readFileSync(resolve(root, "app/api/admin/home-social-image/route.ts"), "utf8");
assert.match(uploadRoute, /requireApiRole\(\["editor", "admin", "owner"\]\)/, "upload must retain Home CMS permissions");
assert.match(uploadRoute, /file\.type !== "image\/jpeg"/, "server must reject non-JPEG processed uploads");
assert.match(uploadRoute, /dimensions\.width !== homeSocialWidth \|\| dimensions\.height !== homeSocialHeight/, "server must validate processed dimensions");

const clientProcessor = readFileSync(resolve(root, "lib/home-social-client.ts"), "utf8");
assert.match(clientProcessor, /imageOrientation: "from-image"/, "processing must honor EXIF orientation");
assert.match(clientProcessor, /Math\.max\(/, "processing must cover-crop without stretching");
assert.match(clientProcessor, /canvas\.toBlob\(resolve, "image\/jpeg"/, "processing must output JPEG");

const adminField = readFileSync(resolve(root, "components/admin/home-social-image-field.tsx"), "utf8");
assert.match(adminField, /type="hidden" name="home_social_image_url"/, "uploaded image must remain staged until settings save");
assert.ok(adminField.includes("儲存／發布"), "admin must explain explicit publication");

for (const path of [
  "app/(public)/knowledge/[slug]/page.tsx",
  "app/(public)/properties/[slug]/page.tsx",
  "app/(public)/[slug]/page.tsx"
]) {
  assert.match(readFileSync(resolve(root, path), "utf8"), /export async function generateMetadata/, `${path} must retain dynamic metadata`);
}

console.log("Homepage social metadata regression checks: PASS");
