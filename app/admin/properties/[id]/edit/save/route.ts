import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { canManageProperties, canManageSensitive, canPublishProperties, getCurrentProfile } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { normalizePropertyForm, toPropertyPayload } from "@/lib/properties/schema";
import { priceChangedContent, todayTaipeiDate, tryInsertPropertyTimelineEvent } from "@/lib/properties/timeline";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

async function resolveUniqueSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  baseSlug: string,
  excludeId: string
) {
  const { data, error } = await supabase
    .from("properties")
    .select("id, slug")
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`)
    .neq("id", excludeId);

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getCurrentProfile();
  if (!current) return redirectTo(request, "/admin/login");
  if (!canManageProperties(current.profile.role)) return redirectTo(request, "/admin/login?error=forbidden");

  const formData = await request.formData();
  let input;
  try {
    input = normalizePropertyForm(formData);
  } catch {
    return redirectTo(request, `/admin/properties/${id}/edit?error=invalid_form`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (!before || before.deleted_at) return redirectTo(request, "/admin/properties?error=not_found");

  const role = current.profile.role;
  if (!canPublishProperties(role) && before.status !== "draft") {
    return redirectTo(request, `/admin/properties/${id}/edit?error=editor_can_edit_draft_only`);
  }

  const payload = toPropertyPayload(input);
  const slug = await resolveUniqueSlug(supabase, payload.slug, id);
  const safePayload = canPublishProperties(role)
    ? progressNotesSafePayload({ ...payload, slug }, role)
    : progressNotesSafePayload({
        ...payload,
        slug,
        status: "draft" as const,
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

  if (error) return redirectTo(request, `/admin/properties/${id}/edit?error=${encodeURIComponent(error.code || "update_failed")}`);

  await tryRecordAuditLog({
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
  revalidatePath(`/admin/properties/${id}/edit`);
  return redirectTo(request, `/admin/properties/${id}/edit?saved=1`);
}
