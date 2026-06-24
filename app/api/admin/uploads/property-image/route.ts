import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadPropertyImageSchema } from "@/lib/validation/common";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const maxSize = 5 * 1024 * 1024;

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

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!allowedTypes.has(file.type) || !allowedExtensions.has(extension) || file.size <= 0 || file.size > maxSize) {
    return apiError("Invalid file", 422);
  }

  const supabase = await createSupabaseServerClient();
  const storagePath = `${auth.current!.user.id}/${propertyId}/${cleanFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("property-media").upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  });
  if (uploadError) return apiError("Unable to upload file", 500);

  const { data: publicUrl } = supabase.storage.from("property-media").getPublicUrl(storagePath);
  const { data, error } = await supabase
    .from("property_media")
    .insert({
      property_id: propertyId,
      media_type: "image",
      url: publicUrl.publicUrl,
      storage_path: storagePath,
      alt_text: parsed.data.alt_text?.trim() || null,
      created_by: auth.current!.user.id,
      updated_by: auth.current!.user.id
    })
    .select()
    .single();
  if (error) return apiError("Unable to save media", 500);
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
