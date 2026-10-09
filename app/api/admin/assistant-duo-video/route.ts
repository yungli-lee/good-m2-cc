import { NextResponse } from "next/server";
import { apiError, requireApiRole } from "@/lib/auth-api";
import { mediaBucketName } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const runtime = "edge";
const MAX_BYTES = 12 * 1024 * 1024;
export async function POST(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  let form: FormData;
  try { form = await request.formData(); } catch { return apiError("影片資料無法讀取", 400); }
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 16 || file.size > MAX_BYTES) return apiError("請選擇 12MB 以下 MP4／WebM 影片", 422);
  if (file.type !== "video/mp4" && file.type !== "video/webm") return apiError("僅支援 MP4／WebM", 422);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mp4 = file.type === "video/mp4" && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  const webm = file.type === "video/webm" && bytes.slice(0, 4).every((v, i) => v === [0x1a, 0x45, 0xdf, 0xa3][i]);
  if (!mp4 && !webm) return apiError("影片內容格式不正確", 422);
  const db = await createSupabaseServerClient();
  const path = `ai-assistants/duo-video/${crypto.randomUUID()}.${mp4 ? "mp4" : "webm"}`;
  const { error: uploadError } = await db.storage.from(mediaBucketName).upload(path, bytes, {
    contentType: file.type, cacheControl: "31536000", upsert: false
  });
  if (uploadError) return apiError("影片上傳失敗", 500);
  const url = db.storage.from(mediaBucketName).getPublicUrl(path).data.publicUrl;
  const { error } = await db.from("ai_assistant_duo_video").upsert({
    id: true, video_url: url, storage_path: path, updated_by: auth.current?.user.id,
    updated_at: new Date().toISOString()
  }, { onConflict: "id" });
  if (error) return apiError("影片已上傳，但設定儲存失敗，原設定仍保留", 500);
  return NextResponse.json({ data: { url } }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
