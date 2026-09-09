export const homeSocialFallbackPath = "/images/social/home-og.jpg";
export const homeSocialWidth = 1200;
export const homeSocialHeight = 630;
export const homeSocialMaxUploadBytes = 5 * 1024 * 1024;
export const homeSocialTargetBytes = 500 * 1024;
export const homeSocialAllowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function absoluteHomeSocialFallback(origin = "https://good.m2.cc") {
  return new URL(homeSocialFallbackPath, origin).toString();
}

export function validHomeSocialUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export function validHomeSocialSetting(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const { url: rawUrl, path } = value as { url?: unknown; path?: unknown };
  if (typeof path !== "string" || !/^home-social\/home-og-[a-zA-Z0-9-]+\.jpg$/.test(path)) return null;
  const url = validHomeSocialUrl(rawUrl);
  if (!url) return null;
  const expectedSuffix = `/storage/v1/object/public/media/${path.split("/").map(encodeURIComponent).join("/")}`;
  return new URL(url).pathname === expectedSuffix ? url : null;
}

export function buildHomeSocialStoragePath(id = crypto.randomUUID()) {
  return `home-social/home-og-${id}.jpg`;
}

export function readJpegInfo(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + length + 2 > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8], components: bytes[offset + 9] };
    }
    offset += length + 2;
  }
  return null;
}

export function readJpegDimensions(bytes: Uint8Array) {
  const info = readJpegInfo(bytes);
  return info ? { width: info.width, height: info.height } : null;
}
