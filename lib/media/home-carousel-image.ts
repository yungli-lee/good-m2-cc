import { parseSupabasePublicUrl } from "./delivery.ts";

/** Keep only the current and immediately following image downloadable. */
export function shouldLoadHeroImage(index: number, active: number, count: number) {
  return count > 0 && (index === active || index === (active + 1) % count);
}

/** Optimize known large CMS raster assets; small/unknown/external assets stay original. */
export function shouldTransformHeroImage(url: string, fileSize?: number | null) {
  const parsed = parseSupabasePublicUrl(url);
  return Boolean(parsed && fileSize && fileSize > 1024 * 1024
    && /\.(?:png|jpe?g|webp|avif)$/i.test(parsed.storagePath));
}
