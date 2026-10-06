export const homeImageSlideDurationMs = 5_000;
export const homeVideoSlideMaxDurationMs = 30_000;

export function homeSlideDurationMs(mediaType: "image" | "video", imageDurationSeconds = 5) {
  if (mediaType === "video") return homeVideoSlideMaxDurationMs;
  const duration = Math.min(30, Math.max(5, imageDurationSeconds));
  return duration * 1_000;
}
