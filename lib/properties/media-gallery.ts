import { getMediaImageUrl, sortPropertyMedia } from "./types.ts";
import type { PropertyMedia } from "./types.ts";

function stableId(item: PropertyMedia) {
  return typeof item.id === "string" ? item.id.trim() : "";
}

export function normalizeMediaUrl(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    url.hash = "";
    return url.toString();
  } catch {
    return trimmed.split("#", 1)[0];
  }
}

export function isSameMedia(left: PropertyMedia, right: PropertyMedia) {
  const leftId = stableId(left);
  const rightId = stableId(right);
  if (leftId && rightId) return leftId === rightId;
  const leftUrl = normalizeMediaUrl(left.url);
  return Boolean(leftUrl) && leftUrl === normalizeMediaUrl(right.url);
}

export function resolvePropertyGallery(media: PropertyMedia[]) {
  const visible = sortPropertyMedia(media).filter((item) => item && !item.deleted_at && Boolean(normalizeMediaUrl(item.url)));
  const sourceImages = visible.filter((item) => item.media_type === "image");
  const coverCandidates = visible.filter((item) => Boolean(getMediaImageUrl(item)));
  const cover = coverCandidates.find((item) => item.is_cover) || coverCandidates[0] || null;
  const images = cover?.media_type === "image"
    ? [cover, ...sourceImages.filter((item) => !isSameMedia(item, cover))]
    : sourceImages;
  const detailMedia = cover ? visible.filter((item) => !isSameMedia(item, cover)) : visible;

  return { visible, images, cover, detailMedia };
}
