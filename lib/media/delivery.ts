export const mediaImageWidths = [384, 640, 960, 1280, 1600, 2048, 2560] as const;

export type MediaImageWidth = (typeof mediaImageWidths)[number];
export type MediaDeliveryTier = "card" | "detail" | "fullscreen" | "original";
export type MediaDeliveryProvider = "supabase" | "external" | "unknown";

export type MediaTierPolicy = {
  widths: readonly MediaImageWidth[];
  defaultWidth: MediaImageWidth | null;
  quality: number | null;
  format: "auto" | "original";
};

export const mediaTierPolicies: Readonly<Record<MediaDeliveryTier, MediaTierPolicy>> = {
  card: {
    widths: [384, 640, 960],
    defaultWidth: 640,
    quality: 75,
    format: "auto"
  },
  detail: {
    widths: [640, 960, 1280, 1600],
    defaultWidth: 1280,
    quality: 82,
    format: "auto"
  },
  fullscreen: {
    // Supabase currently accepts transformed dimensions only up to 2500px.
    // The provider-neutral 2560 bucket remains available for future providers
    // and pre-generated derivatives without emitting an invalid Supabase URL.
    widths: [1280, 1600, 2048],
    defaultWidth: 2048,
    quality: 86,
    format: "auto"
  },
  original: {
    widths: [],
    defaultWidth: null,
    quality: null,
    format: "original"
  }
};

export type CanonicalMediaSource = {
  bucket?: string | null;
  storagePath?: string | null;
  publicUrl?: string | null;
  supabaseUrl?: string | null;
};

export type ParsedSupabasePublicUrl = {
  bucket: string;
  storagePath: string;
  origin: string;
  query: string;
};

export type ResolvedMediaDelivery = {
  provider: MediaDeliveryProvider;
  tier: MediaDeliveryTier;
  src: string;
  srcSet: string;
  widths: readonly MediaImageWidth[];
  quality: number | null;
  originalUrl: string;
  bucket: string | null;
  storagePath: string | null;
};

const publicObjectPrefix = "/storage/v1/object/public/";
const publicRenderPrefix = "/storage/v1/render/image/public/";
const transformableImageExtensions = new Set([
  "avif",
  "bmp",
  "gif",
  "heic",
  "ico",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "tif",
  "tiff",
  "webp"
]);

function isSupabaseHost(hostname: string) {
  return hostname === "supabase.co" || hostname.endsWith(".supabase.co");
}

function safelyDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function encodeStoragePart(value: string) {
  return value.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

function normalizeSupabaseOrigin(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function isTransformableImagePath(storagePath: string) {
  const filename = storagePath.split("/").pop() || "";
  const extension = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() || "" : "";
  return transformableImageExtensions.has(extension);
}

export function parseSupabasePublicUrl(value?: string | null): ParsedSupabasePublicUrl | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!isSupabaseHost(url.hostname) || !url.pathname.startsWith(publicObjectPrefix)) return null;
    const objectPath = url.pathname.slice(publicObjectPrefix.length);
    const separator = objectPath.indexOf("/");
    if (separator <= 0 || separator === objectPath.length - 1) return null;
    return {
      bucket: safelyDecode(objectPath.slice(0, separator)),
      storagePath: objectPath.slice(separator + 1).split("/").map(safelyDecode).join("/"),
      origin: url.origin,
      query: url.search
    };
  } catch {
    return null;
  }
}

function validCanonicalParts(bucket?: string | null, storagePath?: string | null) {
  const normalizedBucket = bucket?.trim() || "";
  const normalizedPath = storagePath?.trim().replace(/^\/+/, "") || "";
  if (!normalizedBucket || normalizedBucket.includes("/") || !normalizedPath) return null;
  return { bucket: normalizedBucket, storagePath: normalizedPath };
}

export function buildSupabasePublicUrl(supabaseUrl: string, bucket: string, storagePath: string) {
  const origin = normalizeSupabaseOrigin(supabaseUrl);
  const parts = validCanonicalParts(bucket, storagePath);
  if (!origin || !parts) return "";
  return `${origin}${publicObjectPrefix}${encodeURIComponent(parts.bucket)}/${encodeStoragePart(parts.storagePath)}`;
}

export function buildSupabaseTransformedUrl(
  publicUrl: string,
  width: MediaImageWidth,
  quality: number
) {
  if (!mediaImageWidths.includes(width)) return publicUrl;
  const parsed = parseSupabasePublicUrl(publicUrl);
  if (!parsed || !isTransformableImagePath(parsed.storagePath) || width > 2500) return publicUrl;
  const url = new URL(publicUrl);
  url.pathname = `${publicRenderPrefix}${encodeURIComponent(parsed.bucket)}/${encodeStoragePart(parsed.storagePath)}`;
  url.searchParams.set("width", String(width));
  url.searchParams.set("quality", String(quality));
  url.searchParams.set("resize", "contain");
  return url.toString();
}

export function resolveMediaDelivery(
  source: CanonicalMediaSource,
  tier: MediaDeliveryTier
): ResolvedMediaDelivery {
  const policy = mediaTierPolicies[tier];
  const legacyUrl = source.publicUrl?.trim() || "";
  const parsedLegacy = parseSupabasePublicUrl(legacyUrl);
  const canonical = validCanonicalParts(source.bucket, source.storagePath);
  const explicitOrigin = normalizeSupabaseOrigin(source.supabaseUrl);
  const canonicalOriginal = canonical && explicitOrigin
    ? buildSupabasePublicUrl(explicitOrigin, canonical.bucket, canonical.storagePath)
    : "";
  const originalUrl = canonicalOriginal || legacyUrl;
  const canonicalIsImage = canonical ? isTransformableImagePath(canonical.storagePath) : false;
  const legacyIsImage = parsedLegacy ? isTransformableImagePath(parsedLegacy.storagePath) : false;
  const transformableUrl = canonicalOriginal && canonicalIsImage
    ? canonicalOriginal
    : parsedLegacy && legacyIsImage
      ? legacyUrl
      : "";
  const provider: MediaDeliveryProvider = canonicalOriginal || parsedLegacy
    ? "supabase"
    : originalUrl
      ? "external"
      : "unknown";

  if (tier === "original" || !transformableUrl || !policy.defaultWidth || !policy.quality) {
    return {
      provider,
      tier,
      src: originalUrl,
      srcSet: "",
      widths: [],
      quality: policy.quality,
      originalUrl,
      bucket: canonical?.bucket || parsedLegacy?.bucket || null,
      storagePath: canonical?.storagePath || parsedLegacy?.storagePath || null
    };
  }

  const urls = policy.widths.map((width) => ({
    width,
    url: buildSupabaseTransformedUrl(transformableUrl, width, policy.quality!)
  }));

  return {
    provider,
    tier,
    src: buildSupabaseTransformedUrl(transformableUrl, policy.defaultWidth, policy.quality),
    srcSet: urls.map(({ width, url }) => `${url} ${width}w`).join(", "),
    widths: policy.widths,
    quality: policy.quality,
    originalUrl,
    bucket: canonical?.bucket || parsedLegacy?.bucket || null,
    storagePath: canonical?.storagePath || parsedLegacy?.storagePath || null
  };
}
