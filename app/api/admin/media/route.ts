import { NextResponse } from "next/server";
import { apiError, requireApiRole } from "@/lib/auth-api";
import { recordAuditLog } from "@/lib/audit/audit-log";
import {
  buildMediaStoragePath,
  listAdminMediaAssets,
  mediaAllowedMimeTypes,
  mediaBucketName,
  mediaExtensionFromFilename,
  mediaExtensionFromMimeType,
  mediaMaxFileSize
} from "@/lib/media";
import { mediaMetadataSchema, parseMediaCategory, parseMediaSort, parseMediaStatus } from "@/lib/media/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

const allowedMimeTypes = new Set<string>(mediaAllowedMimeTypes);

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function uploadError(message: string) {
  return apiError(message, 422);
}

export async function GET(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const supabase = await createSupabaseServerClient();
  const result = await listAdminMediaAssets({
    supabase,
    q: url.searchParams.get("q") || "",
    category: parseMediaCategory(url.searchParams.get("usage")),
    status: parseMediaStatus(url.searchParams.get("status")),
    sort: parseMediaSort(url.searchParams.get("sort"))
  });

  if (result.error) return apiError("Unable to load media", 500);
  return NextResponse.json({ data: result.data });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!isUploadedFile(file)) return uploadError("請選擇圖片檔案。");

  if (!allowedMimeTypes.has(file.type)) return uploadError("圖片格式不支援。");
  if (file.size > mediaMaxFileSize) return uploadError("圖片大小不可超過 5MB。");

  const parsed = mediaMetadataSchema.safeParse({
    alt_text: String(formData.get("alt_text") || ""),
    caption: String(formData.get("caption") || ""),
    usage_type: String(formData.get("usage_type") || "general")
  });
  if (!parsed.success) return uploadError("媒體資料格式不正確。");

  const extension = mediaExtensionFromMimeType(file.type) || mediaExtensionFromFilename(file.name);
  if (!extension) return uploadError("無法辨識檔案副檔名。");

  const supabase = await createSupabaseServerClient();
  const mediaId = crypto.randomUUID();
  const storagePath = buildMediaStoragePath({
    scope: auth.current!.user.id,
    usageType: parsed.data.usage_type,
    mediaId,
    extension
  });

  const { error: uploadStorageError } = await supabase.storage.from(mediaBucketName).upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  });
  if (uploadStorageError) return apiError("圖片上傳失敗。", 500);

  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      id: mediaId,
      bucket: mediaBucketName,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      file_size: file.size,
      alt_text: parsed.data.alt_text || null,
      caption: parsed.data.caption || null,
      usage_type: parsed.data.usage_type,
      status: "active",
      created_by: auth.current!.user.id,
      updated_by: auth.current!.user.id
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(mediaBucketName).remove([storagePath]);
    return apiError("媒體資料儲存失敗。", 500);
  }

  await recordAuditLog({
    action: "media_upload",
    resourceType: "media_asset",
    resourceId: data.id,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email,
    actorRole: auth.current!.profile.role
  });

  return NextResponse.json({ data }, { status: 201 });
}
