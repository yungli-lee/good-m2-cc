import type { PropertyMedia } from "./types";

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
  const visible = media.filter((item) => item && !item.deleted_at && Boolean(normalizeMediaUrl(item.url)));
  const sourceImages = visible.filter((item) => item.media_type === "image");
  const cover = sourceImages.find((item) => item.is_cover) || sourceImages[0] || null;
  const images = cover ? [cover, ...sourceImages.filter((item) => !isSameMedia(item, cover))] : [];
  const detailMedia = cover ? visible.filter((item) => !isSameMedia(item, cover)) : visible;

  return { visible, images, cover, detailMedia };
}
