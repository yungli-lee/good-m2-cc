import { NextResponse } from "next/server";
import { apiError, requireApiRole } from "@/lib/auth-api";
import { mediaBucketName } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const runtime = "edge";
const maxSize = 5 * 1024 * 1024;
export async function POST(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  let form: FormData;
  try { form = await request.formData(); } catch { return apiError("圖片資料無法讀取", 400); }
  const role = form.get("role");
  const file = form.get("file");
  if (role !== "ayong" && role !== "amei") return apiError("角色不正確", 422);
  if (!(file instanceof File) || file.size === 0 || file.size > maxSize) return apiError("請選擇 5MB 以下圖片", 422);
  if (!["image/png", "image/webp"].includes(file.type)) return apiError("僅支援透明背景 PNG 或 WebP", 422);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = file.type === "image/png" && bytes.length > 8 && [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b);
  const webp = file.type === "image/webp" && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  if (!png && !webp) return apiError("圖片內容與副檔名不符", 422);
  const db = await createSupabaseServerClient();
  const path = `ai-assistants/${role}/${crypto.randomUUID()}.${png ? "png" : "webp"}`;
  const { error: uploadError } = await db.storage.from(mediaBucketName).upload(path, bytes, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (uploadError) return apiError("圖片上傳失敗", 500);
  const url = db.storage.from(mediaBucketName).getPublicUrl(path).data.publicUrl;
  const { error } = await db.from("ai_assistant_images").upsert({ role, image_url: url, storage_path: path, updated_by: auth.current.user.id, updated_at: new Date().toISOString() }, { onConflict: "role" });
  if (error) return apiError("圖片已上傳，但設定儲存失敗，原圖仍保留", 500);
  return NextResponse.json({ data: { role, url } }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
