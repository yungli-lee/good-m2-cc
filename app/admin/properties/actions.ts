"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  canDeleteProperties,
  canManagePropertyMedia,
  canManageProperties,
  canManageSensitive,
  canPublishProperties,
  requireRole
} from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import type { DraftPropertyFormState, PropertyFormInput, PropertyFormState } from "@/lib/properties/schema";
import {
  draftPropertySchema,
  draftPropertyValuesFromFormData,
  normalizePropertyForm,
  normalizePropertyValues,
  propertySchema,
  propertyValuesFromFormData,
  toDraftPropertyPayload,
  toPropertyPayload
} from "@/lib/properties/schema";
import { priceChangedContent, todayTaipeiDate, tryInsertPropertyTimelineEvent } from "@/lib/properties/timeline";
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

function isUploadedImageFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
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

async function tryRecordPropertyTimeline(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: Parameters<typeof tryInsertPropertyTimelineEvent>[1]
) {
  await tryInsertPropertyTimelineEvent(supabase, input);
}

async function tryUploadInitialPropertyImage({
  supabase,
  file,
  propertyId,
  userId,
  userEmail,
  altText
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  file: File;
  propertyId: string;
  userId: string;
  userEmail?: string | null;
  altText?: string | null;
}) {
  try {
    assertImageFile(file);
    const filename = cleanFilename(file.name);
    const storagePath = `${userId}/${propertyId}/${filename}`;
    const { error: uploadError } = await supabase.storage.from("property-media").upload(storagePath, file, {
      contentType: file.type,
      upsert: false
    });
    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage.from("property-media").getPublicUrl(storagePath);
    const { data, error } = await supabase
      .from("property_media")
      .insert({
        property_id: propertyId,
        media_type: "image",
        url: publicUrl.publicUrl,
        storage_path: storagePath,
        alt_text: altText || null,
        is_cover: true
      })
      .select()
      .single();

    if (error) {
      await supabase.storage.from("property-media").remove([storagePath]);
      throw error;
    }

    await tryRecordAuditLog({
      action: "property_image_upload",
      resourceType: "property_media",
      resourceId: data.id,
      afterData: data,
      userId,
      userEmail
    });
  } catch (error) {
    console.error("initial_property_image_upload_failed", {
      message: error instanceof Error ? error.message.slice(0, 180) : "unknown"
    });
  }
}

function draftFieldErrors(error: { issues: Array<{ path: Array<string | number>; message: string }> }) {
  return error.issues.reduce<DraftPropertyFormState["fieldErrors"]>((errors, issue) => {
    const field = issue.path[0];
    if (field === "title" || field === "slug" || field === "price" || field === "address_public") {
      errors[field] ||= issue.message;
    }
    return errors;
  }, {});
}

function propertyFieldErrors(error: { issues: Array<{ path: Array<string | number>; message: string }> }) {
  return error.issues.reduce<PropertyFormState["fieldErrors"]>((errors, issue) => {
    const field = issue.path[0];
    if (typeof field === "string" && field in propertySchema.shape) {
      errors[field as keyof PropertyFormState["fieldErrors"]] = issue.message;
    }
    return errors;
  }, {});
}

function propertyCreateErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") return "Slug 已重複，系統自動流水號處理失敗，請稍後再試。";
  if (error.code === "42501") return "資料庫權限不足，請確認 properties insert grant 與 RLS policy。";
  return `物件建立失敗${error.code ? `（${error.code}）` : ""}，請稍後再試。`;
}

async function resolveUniqueSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  baseSlug: string,
  excludeId?: string
) {
  let query = supabase
    .from("properties")
    .select("id, slug")
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error || !data?.length) return baseSlug;

  const existing = new Set(data.map((property) => property.slug));
  if (!existing.has(baseSlug)) return baseSlug;

  let serial = 2;
  while (existing.has(`${baseSlug}-${serial}`)) serial += 1;
  return `${baseSlug}-${serial}`;
}

function progressNotesSafePayload<T extends { progress_notes?: string | null }>(payload: T, role: string) {
  if (canManageSensitive(role as Parameters<typeof canManageSensitive>[0])) return payload;
  const safePayload = { ...payload };
  delete safePayload.progress_notes;
  return safePayload;
}

export async function createDraftPropertyAction(
  _previousState: DraftPropertyFormState,
  formData: FormData
): Promise<DraftPropertyFormState> {
  const current = await requireRole(["editor", "admin", "owner"]);
  if (!canManageProperties(current.profile.role)) redirect("/admin/login?error=forbidden");

  const values = draftPropertyValuesFromFormData(formData);
  const parsed = draftPropertySchema.safeParse(values);
  if (!parsed.success) {
    return {
      values,
      fieldErrors: draftFieldErrors(parsed.error),
      formError: "請確認欄位內容後再送出。"
    };
  }

  const supabase = await createSupabaseServerClient();
  const payload = toDraftPropertyPayload(parsed.data);
  const slug = await resolveUniqueSlug(supabase, payload.slug);
  const { data, error } = await supabase
    .from("properties")
    .insert({
      ...payload,
      slug,
      created_by: current.user.id,
      updated_by: current.user.id
    })
    .select()
    .single();

  if (error) {
    return {
      values,
      fieldErrors: {},
      formError: error.code === "23505" ? "Slug 自動流水號處理失敗，請再送出一次。" : "草稿建立失敗，請稍後再試。"
    };
  }

  await tryRecordAuditLog({
    action: "property_create",
    resourceType: "property",
    resourceId: data.id,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  await tryRecordPropertyTimeline(supabase, {
    property_id: data.id,
    event_date: todayTaipeiDate(),
    event_type: "created",
    title: "新接委託",
    content: data.title,
    created_by: current.user.id,
    created_by_email: current.user.email || current.profile.email || null
  });

  revalidatePath("/admin/properties");
  redirect("/admin/properties");
}

export async function updateDraftPropertyAction(
  id: string,
  _previousState: DraftPropertyFormState,
  formData: FormData
): Promise<DraftPropertyFormState> {
  const current = await requireRole(["editor", "admin", "owner"]);
  if (!canManageProperties(current.profile.role)) redirect("/admin/login?error=forbidden");

  const values = draftPropertyValuesFromFormData(formData);
  const parsed = draftPropertySchema.safeParse(values);
  if (!parsed.success) {
    return {
      values,
      fieldErrors: draftFieldErrors(parsed.error),
      formError: "請確認欄位內容後再送出。"
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("properties").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!before) redirect("/admin/properties?error=not_found");

  const payload = toDraftPropertyPayload(parsed.data);
  const slug = await resolveUniqueSlug(supabase, payload.slug, id);
  const { data, error } = await supabase
    .from("properties")
    .update({
      title: payload.title,
      slug,
      price: payload.price,
      address_public: payload.address_public,
      updated_by: current.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return {
      values,
      fieldErrors: {},
      formError: error.code === "23505" ? "Slug 自動流水號處理失敗，請再送出一次。" : "物件儲存失敗，請稍後再試。"
    };
  }

  await tryRecordAuditLog({
    action: "property_update",
    resourceType: "property",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${id}/edit`);
  revalidatePath("/properties");
  revalidatePath(`/properties/${data.slug}`);
  redirect("/admin/properties");
}

export async function togglePropertyPublishAction(id: string, nextStatus: "draft" | "published") {
  const current = await requireRole(["editor", "admin", "owner"]);
  if (!canManageProperties(current.profile.role)) redirect("/admin/login?error=forbidden");

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("properties").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!before) redirect("/admin/properties?error=not_found");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("properties")
    .update({
      status: nextStatus,
      published_at: nextStatus === "published" ? before.published_at || now : null,
      updated_by: current.user.id,
      updated_at: now
    })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect(`/admin/properties?error=${encodeURIComponent(error.code || "publish_failed")}`);

  await tryRecordAuditLog({
    action: nextStatus === "published" ? "property_publish" : "property_unpublish",
    resourceType: "property",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  await tryRecordPropertyTimeline(supabase, {
    property_id: id,
    event_date: todayTaipeiDate(),
    event_type: nextStatus === "published" ? "published" : "unpublished",
    title: nextStatus === "published" ? "上架" : "下架",
    content: data.title,
    created_by: current.user.id,
    created_by_email: current.user.email || current.profile.email || null
  });

  revalidatePath("/admin/properties");
  revalidatePath("/properties");
  revalidatePath(`/properties/${data.slug}`);
  redirect("/admin/properties");
}

export async function togglePropertyFeaturedAction(id: string, isFeatured: boolean) {
  const current = await requireRole(["editor", "admin", "owner"]);
  if (!canManageProperties(current.profile.role)) redirect("/admin/login?error=forbidden");

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("properties").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!before) redirect("/admin/properties?error=not_found");

  const { data, error } = await supabase
    .from("properties")
    .update({
      is_featured: isFeatured,
      updated_by: current.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();

  if (error) redirect(`/admin/properties?error=${encodeURIComponent(error.code || "featured_failed")}`);

  await tryRecordAuditLog({
    action: "property_featured_change",
    resourceType: "property",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  await tryRecordPropertyTimeline(supabase, {
    property_id: id,
    event_date: todayTaipeiDate(),
    event_type: isFeatured ? "featured" : "unfeatured",
    title: isFeatured ? "設為精選" : "取消精選",
    content: data.title,
    created_by: current.user.id,
    created_by_email: current.user.email || current.profile.email || null
  });

  revalidatePath("/admin/properties");
  revalidatePath("/");
  revalidatePath("/properties");
  redirect("/admin/properties");
}

export async function createPropertyAction(
  _previousState: PropertyFormState,
  formData: FormData
): Promise<PropertyFormState> {
  const current = await requireRole(["editor", "admin", "owner"]);
  if (!canManageProperties(current.profile.role)) redirect("/admin/login?error=forbidden");

  const supabase = await createSupabaseServerClient();
  const values = propertyValuesFromFormData(formData);
  let input: PropertyFormInput;
  try {
    input = normalizePropertyValues(values);
  } catch (error) {
    return {
      values,
      fieldErrors: error instanceof z.ZodError ? propertyFieldErrors(error) : {},
      formError: "請確認欄位內容後再送出。",
      formKey: `validation-${Date.now()}`
    };
  }

  const payload = toPropertyPayload(input);
  const slug = await resolveUniqueSlug(supabase, payload.slug);
  const role = current.profile.role;
  const safePayload = canPublishProperties(role)
    ? progressNotesSafePayload({ ...payload, slug }, role)
    : progressNotesSafePayload({ ...payload, slug, status: "draft", is_featured: false }, role);

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

  if (error) {
    console.error("property_create_failed", {
      code: error.code,
      message: error.message?.slice(0, 180),
      actorRole: current.profile.role
    });
    return {
      values,
      fieldErrors: {},
      formError: propertyCreateErrorMessage(error),
      formKey: `db-${Date.now()}`
    };
  }

  await tryRecordAuditLog({
    action: "property_create",
    resourceType: "property",
    resourceId: data.id,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  await tryRecordPropertyTimeline(supabase, {
    property_id: data.id,
    event_date: todayTaipeiDate(),
    event_type: "created",
    title: "新接委託",
    content: data.title,
    created_by: current.user.id,
    created_by_email: current.user.email || current.profile.email || null
  });

  const file = formData.get("file");
  if (isUploadedImageFile(file)) {
    await tryUploadInitialPropertyImage({
      supabase,
      file,
      propertyId: data.id,
      userId: current.user.id,
      userEmail: current.user.email,
      altText: String(formData.get("alt_text") || "")
    });
  }

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
  const slug = await resolveUniqueSlug(supabase, payload.slug, id);
  const safePayload = canPublishProperties(role)
    ? progressNotesSafePayload({ ...payload, slug }, role)
    : progressNotesSafePayload({
        ...payload,
        slug,
        status: "draft",
        is_featured: before.is_featured
      }, role);

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

  if (before.price !== data.price) {
    await tryRecordPropertyTimeline(supabase, {
      property_id: id,
      event_date: todayTaipeiDate(),
      event_type: "price_changed",
      title: "價格調整",
      content: priceChangedContent(before.price, data.price),
      created_by: current.user.id,
      created_by_email: current.user.email || current.profile.email || null
    });
  }

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

  await tryRecordPropertyTimeline(supabase, {
    property_id: id,
    event_date: todayTaipeiDate(),
    event_type: status === "published" ? "published" : "unpublished",
    title: status === "published" ? "上架" : "下架",
    content: data.title,
    created_by: current.user.id,
    created_by_email: current.user.email || current.profile.email || null
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
      url: publicUrl.publicUrl
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from("property-media").remove([storagePath]);
    const message = error.code === "23502" ? "media_metadata_missing_required_field" : error.code || "media_failed";
    redirect(`/admin/properties/${id}/edit?error=${encodeURIComponent(message)}`);
  }

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
