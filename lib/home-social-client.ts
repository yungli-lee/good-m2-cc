import { homeSocialAllowedTypes, homeSocialHeight, homeSocialMaxUploadBytes, homeSocialTargetBytes, homeSocialWidth } from "./home-social-image.ts";

export function validateHomeSocialSource(file: Pick<File, "type" | "size">) {
  if (!homeSocialAllowedTypes.has(file.type)) return "僅支援 JPEG、PNG 或 WebP 圖片。";
  if (file.size <= 0 || file.size > homeSocialMaxUploadBytes) return "圖片大小需介於 1 byte 到 5MB。";
  return null;
}

export async function processHomeSocialImage(file: File): Promise<File> {
  const error = validateHomeSocialSource(file);
  if (error) throw new Error(error);
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  canvas.width = homeSocialWidth;
  canvas.height = homeSocialHeight;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("瀏覽器無法處理圖片。");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.drawImage(bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  bitmap.close();
  let quality = 0.88;
  let blob: Blob | null = null;
  do {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    quality -= 0.08;
  } while (blob && blob.size > homeSocialTargetBytes && quality >= 0.6);
  if (!blob) throw new Error("圖片轉換失敗。");
  return new File([blob], "home-og.jpg", { type: "image/jpeg" });
}
