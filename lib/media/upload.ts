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
export type ReadableUploadLike = UploadLike & { slice(start?: number, end?: number): Blob };

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

function bytesEqual(bytes: Uint8Array, offset: number, expected: readonly number[]) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function containsBytes(bytes: Uint8Array, expected: readonly number[]) {
  return bytes.some((_, offset) => offset + expected.length <= bytes.length && bytesEqual(bytes, offset, expected));
}

function matchesContentSignature(mimeType: string, bytes: Uint8Array) {
  if (mimeType === "image/jpeg") return bytesEqual(bytes, 0, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/png") return bytesEqual(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === "image/gif") {
    return bytesEqual(bytes, 0, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
      || bytesEqual(bytes, 0, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  }
  if (mimeType === "image/webp") {
    return bytesEqual(bytes, 0, [0x52, 0x49, 0x46, 0x46])
      && bytesEqual(bytes, 8, [0x57, 0x45, 0x42, 0x50]);
  }
  if (mimeType === "video/mp4") {
    return bytesEqual(bytes, 4, [0x66, 0x74, 0x79, 0x70])
      && !bytesEqual(bytes, 8, [0x71, 0x74, 0x20, 0x20]);
  }
  if (mimeType === "video/webm") {
    return bytesEqual(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3])
      && containsBytes(bytes, [0x77, 0x65, 0x62, 0x6d]);
  }
  return false;
}

export async function validateMediaFile(file: ReadableUploadLike, context: MediaUploadContext) {
  const metadata = validateMediaUpload(file, context);
  if (!metadata.ok) return metadata;
  const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  if (!matchesContentSignature(file.type, bytes)) {
    return { ok: false as const, error: "content_signature_mismatch" as const };
  }
  return metadata;
}
