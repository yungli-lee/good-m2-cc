import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadPropertyImageSchema } from "@/lib/validation/common";
import { validateMediaUpload } from "@/lib/media/upload";

export const runtime = "edge";

function cleanFilename(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "property-image"}-${crypto.randomUUID()}.${extension}`;
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const formData = await request.formData();
  const parsed = uploadPropertyImageSchema.safeParse({
    property_id: String(formData.get("property_id") || ""),
    alt_text: String(formData.get("alt_text") || "")
  });
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File)) return apiError("Invalid upload", 422);
  const propertyId = parsed.data.property_id;

  const validation = validateMediaUpload(file, "property");
  if (!validation.ok) return apiError(`Invalid file: ${validation.error}`, 422);
  const poster = formData.get("poster");
  const posterFile = poster instanceof File && poster.size > 0 ? poster : null;
  const posterValidation = posterFile ? validateMediaUpload(posterFile, "poster") : null;
  if (validation.mediaType === "video" && (!posterFile || !posterValidation?.ok)) return apiError("Video poster required", 422);

  const supabase = await createSupabaseServerClient();
  const storagePath = `${auth.current!.user.id}/${propertyId}/${cleanFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("property-media").upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  });
  if (uploadError) return apiError("Unable to upload file", 500);

  const { data: publicUrl } = supabase.storage.from("property-media").getPublicUrl(storagePath);
  let posterStoragePath: string | null = null;
  let posterUrl: string | null = null;
  if (validation.mediaType === "video" && posterFile && posterValidation?.ok) {
    posterStoragePath = `${auth.current!.user.id}/${propertyId}/${cleanFilename(`poster-${crypto.randomUUID()}.${posterValidation.extension}`)}`;
    const { error: posterError } = await supabase.storage.from("property-media").upload(posterStoragePath, posterFile, { contentType: posterFile.type, upsert: false });
    if (posterError) {
      await supabase.storage.from("property-media").remove([storagePath]);
      return apiError("Unable to upload poster", 500);
    }
    posterUrl = supabase.storage.from("property-media").getPublicUrl(posterStoragePath).data.publicUrl;
  }
  const { data, error } = await supabase
    .from("property_media")
    .insert({
      property_id: propertyId,
      media_type: validation.mediaType,
      mime_type: file.type,
      file_size: file.size,
      url: publicUrl.publicUrl,
      storage_path: storagePath,
      thumbnail_url: posterUrl,
      poster_storage_path: posterStoragePath,
      alt_text: parsed.data.alt_text?.trim() || null,
      created_by: auth.current!.user.id,
      updated_by: auth.current!.user.id
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from("property-media").remove([storagePath, posterStoragePath].filter(Boolean) as string[]);
    return apiError("Unable to save media", 500);
  }
  await recordAuditLog({
    action: "property_image_upload",
    resourceType: "property_media",
    resourceId: data.id,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email
  });
  return NextResponse.json({ data }, { status: 201 });
}
