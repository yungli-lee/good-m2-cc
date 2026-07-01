import type { BuildMediaStoragePathInput } from "@/lib/media/types";

const mimeExtensionMap: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

function padMonth(month: number) {
  return String(month).padStart(2, "0");
}

function cleanPathPart(value: string, fallback: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/(^-|-$)/g, "") || fallback;
}

export function mediaExtensionFromMimeType(mimeType: string) {
  return mimeExtensionMap[mimeType] || null;
}

export function mediaExtensionFromFilename(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  return extension.replace(/[^a-z0-9]/g, "") || null;
}

export function buildMediaStoragePath(input: BuildMediaStoragePathInput) {
  const date = input.date || new Date();
  const year = String(date.getUTCFullYear());
  const month = padMonth(date.getUTCMonth() + 1);
  const scope = cleanPathPart(input.scope, "general");
  const usageType = cleanPathPart(input.usageType, "general");
  const mediaId = cleanPathPart(input.mediaId, crypto.randomUUID());
  const extension = cleanPathPart(input.extension.replace(/^\./, ""), "bin");

  return `${scope}/${usageType}/${year}/${month}/${mediaId}.${extension}`;
}
