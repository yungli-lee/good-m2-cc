import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { canManagePropertyMedia, getCurrentProfile } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateMediaFile } from "@/lib/media/upload";

export const runtime = "edge";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

function cleanFilename(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "property-image"}-${crypto.randomUUID()}.${extension}`;
}

function uploadedImageFiles(formData: FormData) {
  return formData.getAll("file").filter((value): value is File => value instanceof File && value.size > 0);
}

async function tryRecordAuditLog(input: Parameters<typeof recordAuditLog>[0]) {
  try {
    await recordAuditLog(input);
  } catch {
    // Audit logging should not block the primary media write path.
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getCurrentProfile();
  if (!current) return redirectTo(request, "/admin/login");
  if (!canManagePropertyMedia(current.profile.role)) return redirectTo(request, "/admin/login?error=forbidden");

  const formData = await request.formData();
  const files = uploadedImageFiles(formData);
  if (!files.length) return redirectTo(request, `/admin/properties/${id}/edit?error=no_file`);
  const validations = await Promise.all(files.map((file) => validateMediaFile(file, "property")));
  if (validations.some((result) => !result.ok)) return redirectTo(request, `/admin/properties/${id}/edit?error=invalid_file`);
  const videoCount = validations.filter((result) => result.ok && result.mediaType === "video").length;
  const poster = formData.get("poster");
  const posterFile = poster instanceof File && poster.size > 0 ? poster : null;
  const posterValidation = posterFile ? await validateMediaFile(posterFile, "poster") : null;
  if (videoCount > 1 || (videoCount === 1 && (!posterFile || !posterValidation?.ok))) {
    return redirectTo(request, `/admin/properties/${id}/edit?error=video_poster_required`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: property } = await supabase.from("properties").select("id").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!property) return redirectTo(request, "/admin/properties?error=not_found");

  const { data: existingCover } = await supabase
    .from("property_media")
    .select("id")
    .eq("property_id", id)
    .eq("is_cover", true)
    .is("deleted_at", null)
    .maybeSingle();

  const rows = [];
  const uploadedPaths: string[] = [];
  for (const [index, file] of files.entries()) {
    const validation = validations[index];
    if (!validation.ok) continue;
    const filename = cleanFilename(file.name);
    const storagePath = `${current.user.id}/${id}/${filename}`;
    const { error: uploadError } = await supabase.storage.from("property-media").upload(storagePath, file, {
      contentType: file.type,
      upsert: false
    });

    if (uploadError) {
      if (uploadedPaths.length) await supabase.storage.from("property-media").remove(uploadedPaths);
      return redirectTo(request, `/admin/properties/${id}/edit?error=${encodeURIComponent(uploadError.message)}`);
    }
    uploadedPaths.push(storagePath);

    const { data: publicUrl } = supabase.storage.from("property-media").getPublicUrl(storagePath);
    if (!publicUrl.publicUrl) {
      await supabase.storage.from("property-media").remove(uploadedPaths);
      return redirectTo(request, `/admin/properties/${id}/edit?error=media_url_failed`);
    }

    let posterUrl: string | null = null;
    let posterStoragePath: string | null = null;
    if (validation.mediaType === "video" && posterFile && posterValidation?.ok) {
      posterStoragePath = `${current.user.id}/${id}/${cleanFilename(`poster-${crypto.randomUUID()}.${posterValidation.extension}`)}`;
      const { error: posterUploadError } = await supabase.storage.from("property-media").upload(posterStoragePath, posterFile, {
        contentType: posterFile.type,
        upsert: false
      });
      if (posterUploadError) {
        await supabase.storage.from("property-media").remove(uploadedPaths);
        return redirectTo(request, `/admin/properties/${id}/edit?error=poster_upload_failed`);
      }
      uploadedPaths.push(posterStoragePath);
      posterUrl = supabase.storage.from("property-media").getPublicUrl(posterStoragePath).data.publicUrl;
    }

    rows.push({
      property_id: id,
      media_type: validation.mediaType,
      mime_type: file.type,
      file_size: file.size,
      url: publicUrl.publicUrl,
      storage_path: storagePath,
      thumbnail_url: posterUrl,
      poster_storage_path: posterStoragePath,
      alt_text: String(formData.get("alt_text") || "").trim() || null,
      is_cover: !existingCover && index === 0 && validation.mediaType === "image"
    });
  }

  const { data: inserted, error } = await supabase
    .from("property_media")
    .insert(rows)
    .select();

  if (error) {
    await supabase.storage.from("property-media").remove(uploadedPaths);
    const message = error.code === "23502" ? "media_metadata_missing_required_field" : error.code || "media_failed";
    console.error("property_media_insert_failed", {
      code: error.code,
      message: error.message?.slice(0, 180)
    });
    return redirectTo(request, `/admin/properties/${id}/edit?error=${encodeURIComponent(message)}`);
  }

  for (const data of inserted || []) {
    await tryRecordAuditLog({
      action: "property_image_upload",
      resourceType: "property_media",
      resourceId: data.id,
      afterData: data,
      userId: current.user.id,
      userEmail: current.user.email
    });
  }

  revalidatePath(`/admin/properties/${id}/edit`);
  return redirectTo(request, `/admin/properties/${id}/edit?saved=1`);
}
