import { NextResponse } from "next/server";
import { apiError, requireApiRole } from "@/lib/auth-api";
import { buildHomeSocialStoragePath, homeSocialHeight, homeSocialMaxUploadBytes, homeSocialWidth, readJpegInfo } from "@/lib/home-social-image";
import { mediaBucketName } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || file.size <= 0) return apiError("請選擇圖片。", 422);
  if (file.type !== "image/jpeg" || file.size > homeSocialMaxUploadBytes) return apiError("處理後檔案必須是 5MB 以下的 JPEG。", 422);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dimensions = readJpegInfo(bytes);
  if (!dimensions || dimensions.width !== homeSocialWidth || dimensions.height !== homeSocialHeight || dimensions.components !== 3) {
    return apiError("處理後圖片必須是 1200×630 RGB JPEG。", 422);
  }
  const storagePath = buildHomeSocialStoragePath();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(mediaBucketName).upload(storagePath, bytes, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false
  });
  if (error) return apiError("首頁分享圖片上傳失敗。", 500);
  const publicUrl = supabase.storage.from(mediaBucketName).getPublicUrl(storagePath).data.publicUrl;
  if (!publicUrl?.startsWith("https://")) return apiError("無法取得圖片公開網址。", 500);
  try {
    const publicResponse = await fetch(publicUrl, { signal: AbortSignal.timeout(3000), headers: { Accept: "image/jpeg" } });
    if (!publicResponse.ok || !publicResponse.headers.get("content-type")?.toLowerCase().startsWith("image/jpeg")) {
      return apiError("圖片已上傳，但公開讀取驗證失敗，尚未套用。", 502);
    }
  } catch {
    return apiError("圖片已上傳，但公開讀取驗證逾時，尚未套用。", 502);
  }
  return NextResponse.json({ data: { url: publicUrl, path: storagePath, width: dimensions.width, height: dimensions.height, type: "image/jpeg", size: file.size } }, { status: 201 });
}
