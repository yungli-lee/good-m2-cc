import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canUpdatePropertyTimeline,
  propertyTimelineFormSchema,
  propertyTimelineValuesFromFormData,
  sanitizeTimelineDbError,
  timelineUpdateRedirectPath,
  updatePropertyTimelineEvent
} from "@/lib/properties/timeline";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
};

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

async function tryRecordAuditLog(input: Parameters<typeof recordAuditLog>[0]) {
  try {
    await recordAuditLog(input);
  } catch {
    // Audit logging should not block timeline edits.
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  const { id, eventId } = await params;
  const editPath = `/admin/properties/${id}/edit`;
  const current = await getCurrentProfile();
  if (!current) return redirectTo(request, "/admin/login");
  if (!canUpdatePropertyTimeline(current.profile.role)) return redirectTo(request, "/admin/login?error=forbidden");

  const formData = await request.formData();
  const parsed = propertyTimelineFormSchema.safeParse(propertyTimelineValuesFromFormData(formData));
  if (!parsed.success) return redirectTo(request, `${editPath}?timeline_error=invalid_form`);

  const supabase = await createSupabaseServerClient();
  const { data: before, error: beforeError } = await supabase
    .from("property_timeline_events")
    .select("*")
    .eq("id", eventId)
    .eq("property_id", id)
    .maybeSingle();

  if (beforeError) {
    console.error("property_timeline_update_lookup_failed", sanitizeTimelineDbError(beforeError));
    return redirectTo(request, `${editPath}?timeline_error=update_failed`);
  }
  if (!before) return redirectTo(request, `${editPath}?timeline_error=not_found`);

  const result = await updatePropertyTimelineEvent(supabase, id, eventId, {
    event_date: parsed.data.event_date,
    event_type: parsed.data.event_type,
    title: parsed.data.title,
    content: parsed.data.content || null,
    updated_by: current.user.id
  });

  const redirectPath = timelineUpdateRedirectPath(id, result);
  if (result.error || !result.data?.id) {
    console.error("property_timeline_update_failed", sanitizeTimelineDbError(result.error));
    return redirectTo(request, redirectPath);
  }

  await tryRecordAuditLog({
    action: "timeline_event_update",
    resourceType: "property_timeline_event",
    resourceId: eventId,
    beforeData: before,
    afterData: parsed.data,
    userId: current.user.id,
    userEmail: current.user.email || current.profile.email || null,
    actorRole: current.profile.role
  });

  revalidatePath(editPath);
  return redirectTo(request, redirectPath);
}
