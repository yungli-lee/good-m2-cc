"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { canDeleteKnowledge, canEditKnowledge, canPublishKnowledge } from "@/lib/content/permissions";
import { getKnowledgeItem } from "@/lib/content/queries";
import {
  knowledgeFormSchema,
  splitTagNames,
  toKnowledgePayload,
  toSafeSlug,
  valuesFromFormData
} from "@/lib/content/schema";
import type { ContentItem, ContentTag } from "@/lib/content/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function actorEmail(current: Awaited<ReturnType<typeof requireRole>>) {
  return current.user.email || current.profile.email || null;
}

function auditMetadata(item: Pick<ContentItem, "id" | "content_type" | "title" | "status" | "legal_status">) {
  return {
    content_id: item.id,
    content_type: item.content_type,
    title: item.title,
    status: item.status,
    legal_status: item.legal_status
  };
}

async function tryRecordAuditLog(input: Parameters<typeof recordAuditLog>[0]) {
  try {
    await recordAuditLog(input);
  } catch {
    // Audit logging should not block content editing.
  }
}

async function resolveUniqueContentSlug(baseSlug: string, excludeId?: string) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("content_items")
    .select("id,slug")
    .eq("content_type", "knowledge")
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error || !data?.length) return baseSlug;

  const existing = new Set(data.map((item) => item.slug));
  if (!existing.has(baseSlug)) return baseSlug;

  let serial = 2;
  while (existing.has(`${baseSlug}-${serial}`)) serial += 1;
  return `${baseSlug}-${serial}`;
}

async function resolveUniqueTagSlug(baseSlug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_tags")
    .select("slug")
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`);

  if (error || !data?.length) return baseSlug;

  const existing = new Set(data.map((tag) => tag.slug));
  if (!existing.has(baseSlug)) return baseSlug;

  let serial = 2;
  while (existing.has(`${baseSlug}-${serial}`)) serial += 1;
  return `${baseSlug}-${serial}`;
}

async function syncTags(contentId: string, tagText: string | undefined, role: string, userId: string) {
  const names = splitTagNames(tagText);
  const supabase = await createSupabaseServerClient();
  const tags: ContentTag[] = [];

  if (names.length) {
    const { data: existing, error } = await supabase
      .from("content_tags")
      .select("id,name,slug,description,deleted_at")
      .in("name", names)
      .is("deleted_at", null);

    if (error) {
      console.error("content_tag_lookup_failed", { code: error.code, message: error.message });
      return;
    }

    tags.push(...((existing || []) as ContentTag[]));
    const existingNames = new Set(tags.map((tag) => tag.name));

    if (role === "admin" || role === "owner") {
      for (const name of names.filter((name) => !existingNames.has(name))) {
        const slug = await resolveUniqueTagSlug(toSafeSlug(name, "tag"));
        const { data, error: insertError } = await supabase
          .from("content_tags")
          .insert({ name, slug, created_by: userId, updated_by: userId })
          .select("id,name,slug,description,deleted_at")
          .single();

        if (insertError) {
          console.error("content_tag_create_failed", { code: insertError.code, message: insertError.message });
          continue;
        }

        tags.push(data as ContentTag);
      }
    }
  }

  const { error: deleteError } = await supabase
    .from("content_item_tags")
    .delete()
    .eq("content_id", contentId);

  if (deleteError) {
    console.error("content_item_tags_delete_failed", { code: deleteError.code, message: deleteError.message });
    return;
  }

  if (!tags.length) return;

  const { error: insertError } = await supabase
    .from("content_item_tags")
    .insert(tags.map((tag) => ({ content_id: contentId, tag_id: tag.id, created_by: userId })));

  if (insertError) {
    console.error("content_item_tags_insert_failed", { code: insertError.code, message: insertError.message });
  }
}

export async function createKnowledgeAction(formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const values = valuesFromFormData(formData);
  const parsed = knowledgeFormSchema.safeParse(values);
  if (!parsed.success) redirect("/admin/knowledge/new?error=invalid_form");

  const supabase = await createSupabaseServerClient();
  const basePayload = toKnowledgePayload(parsed.data, current.profile.role, current.user.id);
  const slug = await resolveUniqueContentSlug(basePayload.slug);
  const payload = {
    ...basePayload,
    slug,
    canonical_url: `/knowledge/${slug}`,
    status: "draft",
    created_by: current.user.id
  };

  const { data, error } = await supabase
    .from("content_items")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("knowledge_create_failed", { code: error.code, message: error.message });
    redirect(`/admin/knowledge/new?error=${encodeURIComponent(error.code || "create_failed")}`);
  }

  await syncTags(data.id, parsed.data.tags, current.profile.role, current.user.id);
  await tryRecordAuditLog({
    action: "content_create",
    resourceType: "content_item",
    resourceId: data.id,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role,
    metadata: auditMetadata(data as ContentItem)
  });

  revalidatePath("/admin/knowledge");
  redirect(`/admin/knowledge/${data.id}/edit?saved=1`);
}

export async function updateKnowledgeAction(id: string, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const { data: item } = await getKnowledgeItem(id);
  if (!item) redirect("/admin/knowledge?error=not_found");
  if (!canEditKnowledge(current.profile.role, item)) redirect(`/admin/knowledge/${id}/edit?error=forbidden`);

  const values = valuesFromFormData(formData);
  const parsed = knowledgeFormSchema.safeParse(values);
  if (!parsed.success) redirect(`/admin/knowledge/${id}/edit?error=invalid_form`);

  const supabase = await createSupabaseServerClient();
  const basePayload = toKnowledgePayload(parsed.data, current.profile.role, current.user.id, item);
  const slug = await resolveUniqueContentSlug(basePayload.slug, id);
  const payload = { ...basePayload, slug, canonical_url: `/knowledge/${slug}` };

  const { data, error } = await supabase
    .from("content_items")
    .update(payload)
    .eq("id", id)
    .eq("content_type", "knowledge")
    .select("*")
    .single();

  if (error) {
    console.error("knowledge_update_failed", { code: error.code, message: error.message });
    redirect(`/admin/knowledge/${id}/edit?error=${encodeURIComponent(error.code || "update_failed")}`);
  }

  await syncTags(id, parsed.data.tags, current.profile.role, current.user.id);
  await tryRecordAuditLog({
    action: "content_update",
    resourceType: "content_item",
    resourceId: id,
    beforeData: item,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role,
    metadata: auditMetadata(data as ContentItem)
  });

  revalidatePath("/admin/knowledge");
  redirect(`/admin/knowledge/${id}/edit?saved=1`);
}

export async function publishKnowledgeAction(id: string) {
  const current = await requireRole(["admin", "owner"]);
  if (!canPublishKnowledge(current.profile.role)) redirect("/admin/knowledge?error=forbidden");

  const { data: item } = await getKnowledgeItem(id);
  if (!item) redirect("/admin/knowledge?error=not_found");

  const now = new Date().toISOString();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      status: "published",
      published_at: now,
      first_published_at: item.first_published_at || now,
      deleted_at: null,
      updated_by: current.user.id
    })
    .eq("id", id)
    .eq("content_type", "knowledge")
    .select("*")
    .single();

  if (error) {
    console.error("knowledge_publish_failed", { code: error.code, message: error.message });
    redirect(`/admin/knowledge?error=${encodeURIComponent(error.code || "publish_failed")}`);
  }

  await tryRecordAuditLog({
    action: "content_publish",
    resourceType: "content_item",
    resourceId: id,
    beforeData: item,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role,
    metadata: auditMetadata(data as ContentItem)
  });

  revalidatePath("/admin/knowledge");
  redirect("/admin/knowledge?saved=published");
}

export async function archiveKnowledgeAction(id: string) {
  const current = await requireRole(["admin", "owner"]);
  if (!canPublishKnowledge(current.profile.role)) redirect("/admin/knowledge?error=forbidden");

  const { data: item } = await getKnowledgeItem(id);
  if (!item) redirect("/admin/knowledge?error=not_found");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_items")
    .update({ status: "archived", published_at: null, updated_by: current.user.id })
    .eq("id", id)
    .eq("content_type", "knowledge")
    .select("*")
    .single();

  if (error) {
    console.error("knowledge_archive_failed", { code: error.code, message: error.message });
    redirect(`/admin/knowledge?error=${encodeURIComponent(error.code || "archive_failed")}`);
  }

  await tryRecordAuditLog({
    action: "content_unpublish",
    resourceType: "content_item",
    resourceId: id,
    beforeData: item,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role,
    metadata: auditMetadata(data as ContentItem)
  });

  revalidatePath("/admin/knowledge");
  redirect("/admin/knowledge?saved=archived");
}

export async function softDeleteKnowledgeAction(id: string) {
  const current = await requireRole(["admin", "owner"]);
  if (!canDeleteKnowledge(current.profile.role)) redirect("/admin/knowledge?error=forbidden");

  const { data: item } = await getKnowledgeItem(id);
  if (!item) redirect("/admin/knowledge?error=not_found");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_items")
    .update({ deleted_at: new Date().toISOString(), status: "archived", updated_by: current.user.id })
    .eq("id", id)
    .eq("content_type", "knowledge")
    .select("*")
    .single();

  if (error) {
    console.error("knowledge_delete_failed", { code: error.code, message: error.message });
    redirect(`/admin/knowledge?error=${encodeURIComponent(error.code || "delete_failed")}`);
  }

  await tryRecordAuditLog({
    action: "content_delete",
    resourceType: "content_item",
    resourceId: id,
    beforeData: item,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role,
    metadata: auditMetadata(data as ContentItem)
  });

  revalidatePath("/admin/knowledge");
  redirect("/admin/knowledge?saved=deleted");
}

export async function restoreKnowledgeAction(id: string) {
  const current = await requireRole(["admin", "owner"]);
  if (!canDeleteKnowledge(current.profile.role)) redirect("/admin/knowledge?error=forbidden");

  const { data: item } = await getKnowledgeItem(id);
  if (!item) redirect("/admin/knowledge?error=not_found");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_items")
    .update({ deleted_at: null, status: "draft", updated_by: current.user.id })
    .eq("id", id)
    .eq("content_type", "knowledge")
    .select("*")
    .single();

  if (error) {
    console.error("knowledge_restore_failed", { code: error.code, message: error.message });
    redirect(`/admin/knowledge?error=${encodeURIComponent(error.code || "restore_failed")}`);
  }

  await tryRecordAuditLog({
    action: "content_restore",
    resourceType: "content_item",
    resourceId: id,
    beforeData: item,
    afterData: data,
    userId: current.user.id,
    userEmail: actorEmail(current),
    actorRole: current.profile.role,
    metadata: auditMetadata(data as ContentItem)
  });

  revalidatePath("/admin/knowledge");
  redirect("/admin/knowledge?saved=restored");
}

