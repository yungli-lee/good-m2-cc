"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canDeleteProperties,
  canManagePropertyMedia,
  canManageProperties,
  canPublishProperties,
  requireRole
} from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import type { PropertyFormInput } from "@/lib/properties/schema";
import { normalizePropertyForm, toPropertyPayload } from "@/lib/properties/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const maxImageSize = 5 * 1024 * 1024;

function cleanFilename(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "property-image"}-${crypto.randomUUID()}.${extension}`;
}

function assertImageFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!imageTypes.has(file.type) || !imageExtensions.has(extension)) {
    throw new Error("unsupported_file_type");
  }
  if (file.size <= 0 || file.size > maxImageSize) {
    throw new Error("invalid_file_size");
  }
}

function parsePropertyFormOrRedirect(formData: FormData, redirectTo: string): PropertyFormInput {
  try {
    return normalizePropertyForm(formData);
  } catch {
    redirect(`${redirectTo}?error=invalid_form`);
  }
}

async function tryRecordAuditLog(input: Parameters<typeof recordAuditLog>[0]) {
  try {
    await recordAuditLog(input);
  } catch {
    // Audit logging should not block the primary property write path.
  }
}

export async function createPropertyAction(formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  if (!canManageProperties(current.profile.role)) redirect("/admin/login?error=forbidden");

  const supabase = await createSupabaseServerClient();
  const input = parsePropertyFormOrRedirect(formData, "/admin/properties/new");
  const payload = toPropertyPayload(input);
  const role = current.profile.role;
  const safePayload = canPublishProperties(role)
    ? payload
    : { ...payload, status: "draft", is_featured: false };

  const { data, error } = await supabase
    .from("properties")
    .insert({
      ...safePayload,
      published_at: safePayload.status === "published" ? new Date().toISOString() : null,
      created_by: current.user.id,
      updated_by: current.user.id
    })
    .select()
    .single();

  if (error) redirect(`/admin/properties/new?error=${encodeURIComponent(error.code || "create_failed")}`);

  await tryRecordAuditLog({
    action: "property_create",
    resourceType: "property",
    resourceId: data.id,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/properties");
  redirect(`/admin/properties/${data.id}/edit`);
}

export async function updatePropertyAction(id: string, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  if (!canManageProperties(current.profile.role)) redirect("/admin/login?error=forbidden");

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (!before || before.deleted_at) redirect("/admin/properties?error=not_found");

  const role = current.profile.role;
  if (!canPublishProperties(role) && before.status !== "draft") {
    redirect(`/admin/properties/${id}/edit?error=editor_can_edit_draft_only`);
  }

  const input = parsePropertyFormOrRedirect(formData, `/admin/properties/${id}/edit`);
  const payload = toPropertyPayload(input);
  const safePayload = canPublishProperties(role)
    ? payload
    : {
        ...payload,
        status: "draft",
        is_featured: before.is_featured
      };

  const { data, error } = await supabase
    .from("properties")
    .update({
      ...safePayload,
      published_at: safePayload.status === "published" && !before.published_at ? new Date().toISOString() : before.published_at,
      updated_by: current.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect(`/admin/properties/${id}/edit?error=${encodeURIComponent(error.code || "update_failed")}`);

  await recordAuditLog({
    action: "property_update",
    resourceType: "property",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/properties");
  revalidatePath(`/properties/${data.slug}`);
  redirect(`/admin/properties/${id}/edit?saved=1`);
}

export async function publishPropertyAction(id: string, status: "published" | "archived") {
  const current = await requireRole(["admin", "owner"]);
  if (!canPublishProperties(current.profile.role)) redirect("/admin/login?error=forbidden");
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (!before) redirect("/admin/properties?error=not_found");

  const { data, error } = await supabase
    .from("properties")
    .update({
      status,
      published_at: status === "published" && !before.published_at ? new Date().toISOString() : before.published_at,
      updated_by: current.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect(`/admin/properties?error=${encodeURIComponent(error.code || "publish_failed")}`);

  await recordAuditLog({
    action: status === "published" ? "property_publish" : "property_unpublish",
    resourceType: "property",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/properties");
  revalidatePath(`/properties/${data.slug}`);
  redirect("/admin/properties");
}

export async function deletePropertyAction(id: string) {
  const current = await requireRole(["admin", "owner"]);
  if (!canDeleteProperties(current.profile.role)) redirect("/admin/login?error=forbidden");
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (!before) redirect("/admin/properties?error=not_found");

  const { data, error } = await supabase
    .from("properties")
    .update({ deleted_at: new Date().toISOString(), updated_by: current.user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect(`/admin/properties?error=${encodeURIComponent(error.code || "delete_failed")}`);

  await recordAuditLog({
    action: "property_delete",
    resourceType: "property",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/properties");
  redirect("/admin/properties");
}

export async function uploadPropertyImageAction(id: string, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  if (!canManagePropertyMedia(current.profile.role)) redirect("/admin/login?error=forbidden");

  const file = formData.get("file");
  if (!(file instanceof File)) redirect(`/admin/properties/${id}/edit?error=no_file`);
  try {
    assertImageFile(file);
  } catch {
    redirect(`/admin/properties/${id}/edit?error=invalid_file`);
  }

  const supabase = await createSupabaseServerClient();
  const filename = cleanFilename(file.name);
  const storagePath = `${current.user.id}/${id}/${filename}`;
  const { error: uploadError } = await supabase.storage.from("property-media").upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  });

  if (uploadError) redirect(`/admin/properties/${id}/edit?error=${encodeURIComponent(uploadError.message)}`);

  const { data: publicUrl } = supabase.storage.from("property-media").getPublicUrl(storagePath);
  const { data, error } = await supabase
    .from("property_media")
    .insert({
      property_id: id,
      media_type: "image",
      url: publicUrl.publicUrl,
      storage_path: storagePath,
      alt_text: String(formData.get("alt_text") || "").trim() || null
    })
    .select()
    .single();

  if (error) redirect(`/admin/properties/${id}/edit?error=${encodeURIComponent(error.code || "media_failed")}`);

  await recordAuditLog({
    action: "property_cover_set",
    resourceType: "property_media",
    resourceId: data.id,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath(`/admin/properties/${id}/edit`);
  redirect(`/admin/properties/${id}/edit?saved=1`);
}

export async function setCoverImageAction(propertyId: string, mediaId: string) {
  const current = await requireRole(["editor", "admin", "owner"]);
  if (!canManagePropertyMedia(current.profile.role)) redirect("/admin/login?error=forbidden");
  const supabase = await createSupabaseServerClient();

  await supabase.from("property_media").update({ is_cover: false }).eq("property_id", propertyId);
  const { data, error } = await supabase
    .from("property_media")
    .update({ is_cover: true, updated_at: new Date().toISOString() })
    .eq("id", mediaId)
    .eq("property_id", propertyId)
    .select()
    .single();

  if (error) redirect(`/admin/properties/${propertyId}/edit?error=${encodeURIComponent(error.code || "cover_failed")}`);

  await recordAuditLog({
    action: "property_image_upload",
    resourceType: "property_media",
    resourceId: mediaId,
    afterData: { is_cover: true, media: data },
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath(`/admin/properties/${propertyId}/edit`);
  redirect(`/admin/properties/${propertyId}/edit?saved=1`);
}
