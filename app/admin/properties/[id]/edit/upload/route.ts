import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { canManagePropertyMedia, getCurrentProfile } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const maxImageSize = 5 * 1024 * 1024;

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

function cleanFilename(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "property-image"}-${crypto.randomUUID()}.${extension}`;
}

function isImageFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return imageTypes.has(file.type) && imageExtensions.has(extension) && file.size > 0 && file.size <= maxImageSize;
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
  const file = formData.get("file");
  if (!(file instanceof File)) return redirectTo(request, `/admin/properties/${id}/edit?error=no_file`);
  if (!isImageFile(file)) return redirectTo(request, `/admin/properties/${id}/edit?error=invalid_file`);

  const supabase = await createSupabaseServerClient();
  const filename = cleanFilename(file.name);
  const storagePath = `${current.user.id}/${id}/${filename}`;
  const { error: uploadError } = await supabase.storage.from("property-media").upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  });

  if (uploadError) return redirectTo(request, `/admin/properties/${id}/edit?error=${encodeURIComponent(uploadError.message)}`);

  const { data: publicUrl } = supabase.storage.from("property-media").getPublicUrl(storagePath);
  if (!publicUrl.publicUrl) return redirectTo(request, `/admin/properties/${id}/edit?error=media_url_failed`);

  const { data, error } = await supabase
    .from("property_media")
    .insert({
      property_id: id,
      media_type: "image",
      url: publicUrl.publicUrl,
      alt_text: String(formData.get("alt_text") || "").trim() || null
    })
    .select()
    .single();

  if (error) return redirectTo(request, `/admin/properties/${id}/edit?error=${encodeURIComponent(error.code || "media_failed")}`);

  await tryRecordAuditLog({
    action: "property_image_upload",
    resourceType: "property_media",
    resourceId: data.id,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath(`/admin/properties/${id}/edit`);
  return redirectTo(request, `/admin/properties/${id}/edit?saved=1`);
}
