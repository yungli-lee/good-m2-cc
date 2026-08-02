import {
  homepageVideoMaxFileSize,
  mediaImageMaxFileSize,
  propertyVideoMaxFileSize
} from "./constants.ts";
import { mediaExtensionFromFilename } from "./path.ts";

export type MediaUploadContext = "homepage" | "property" | "poster";

const allowedPairs: Record<string, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"]
};

export type UploadLike = { name: string; type: string; size: number };

export function validateMediaUpload(file: UploadLike, context: MediaUploadContext) {
  const extension = mediaExtensionFromFilename(file.name);
  const allowedExtensions = allowedPairs[file.type];
  if (!extension || !allowedExtensions?.includes(extension)) {
    return { ok: false as const, error: "mime_extension_mismatch" as const };
  }

  const isVideo = file.type === "video/mp4" || file.type === "video/webm";
  if (context === "poster" && isVideo) return { ok: false as const, error: "invalid_poster_mime" as const };
  if (context !== "poster" && !isVideo && !file.type.startsWith("image/")) {
    return { ok: false as const, error: "unsupported_mime" as const };
  }
  if (file.size <= 0) return { ok: false as const, error: "empty_file" as const };

  const maxSize = context === "property" && isVideo
    ? propertyVideoMaxFileSize
    : isVideo
      ? homepageVideoMaxFileSize
      : mediaImageMaxFileSize;
  if (file.size > maxSize) return { ok: false as const, error: "file_too_large" as const };

  return { ok: true as const, mediaType: isVideo ? "video" as const : "image" as const, extension };
}
