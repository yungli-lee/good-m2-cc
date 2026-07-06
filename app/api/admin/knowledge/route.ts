import { NextResponse } from "next/server";
import { apiError, requireApiRole } from "@/lib/auth-api";
import { recordAuditLog } from "@/lib/audit/audit-log";
import {
  knowledgeFormSchema,
  splitTagNames,
  toKnowledgePayload,
  toSafeSlug,
  valuesFromFormData
} from "@/lib/content/schema";
import type { ContentCategory, ContentItem, ContentTag } from "@/lib/content/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const runtime = "edge";

function categoryLabel(item: Pick<ContentItem, "category_id"> & { content_categories?: Pick<ContentCategory, "name"> | null }) {
  return item.content_categories?.name || item.category_id || null;
}

function auditMetadata(item: Pick<ContentItem, "id" | "content_type" | "title" | "slug" | "status" | "legal_status" | "category_id"> & { content_categories?: Pick<ContentCategory, "name"> | null }) {
  return {
    content_id: item.id,
    content_type: item.content_type,
    title: item.title,
    slug: item.slug,
    status: item.status,
    legal_status: item.legal_status,
    category: categoryLabel(item)
  };
}

function revalidateKnowledgePaths(id: string, oldSlug?: string | null, newSlug?: string | null) {
  revalidatePath("/admin/knowledge");
  revalidatePath(`/admin/knowledge/${id}/edit`);
  revalidatePath("/knowledge");
  if (oldSlug) revalidatePath(`/knowledge/${oldSlug}`);
  if (newSlug && newSlug !== oldSlug) revalidatePath(`/knowledge/${newSlug}`);
}

function isMissingImageFitColumn(error: { code?: string; message?: string } | null) {
  return Boolean(error && error.code === "PGRST204" && String(error.message || "").includes("image_fit"));
}

function withoutImageFit<T extends Record<string, unknown>>(payload: T) {
  const next = { ...payload };
  delete next.image_fit;
  return next;
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

export async function POST(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;

  const formData = await request.formData();
  const parsed = knowledgeFormSchema.safeParse(valuesFromFormData(formData));
  if (!parsed.success) return apiError("欄位格式不正確，請確認必填欄位與 URL / 日期格式。", 422);

  const supabase = await createSupabaseServerClient();
  const basePayload = toKnowledgePayload(parsed.data, auth.current!.profile.role, auth.current!.user.id);
  const slug = await resolveUniqueContentSlug(basePayload.slug);
  const payload = {
    ...basePayload,
    slug,
    canonical_url: `/knowledge/${slug}`,
    status: "draft",
    created_by: auth.current!.user.id
  };

  let { data, error } = await supabase
    .from("content_items")
    .insert(payload)
    .select("*")
    .single();

  if (isMissingImageFitColumn(error)) {
    const retry = await supabase
      .from("content_items")
      .insert(withoutImageFit(payload))
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("knowledge_create_failed", { code: error.code, message: error.message });
    return apiError(`新增失敗：${error.code || "create_failed"}`, 500);
  }

  await syncTags(data.id, parsed.data.tags, auth.current!.profile.role, auth.current!.user.id);
  await recordAuditLog({
    action: "content_create",
    resourceType: "content_item",
    resourceId: data.id,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email || auth.current!.profile.email || null,
    actorRole: auth.current!.profile.role,
    metadata: auditMetadata(data as ContentItem)
  }).catch(() => null);

  revalidateKnowledgePaths(data.id, null, data.slug);
  return NextResponse.json({
    ok: true,
    message: "儲存成功",
    data,
    redirectTo: `/admin/knowledge/${data.id}/edit?saved=1`
  }, { status: 201 });
}
