import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canCreatePropertyTimeline,
  insertPropertyTimelineEvent,
  propertyTimelineFormSchema,
  propertyTimelineValuesFromFormData,
  sanitizeTimelineDbError,
  timelineCreateRedirectPath
} from "@/lib/properties/timeline";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
};

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const editPath = `/admin/properties/${id}/edit`;
  const current = await getCurrentProfile();
  if (!current) return redirectTo(request, "/admin/login");
  if (!canCreatePropertyTimeline(current.profile.role)) return redirectTo(request, "/admin/login?error=forbidden");

  const formData = await request.formData();
  const parsed = propertyTimelineFormSchema.safeParse(propertyTimelineValuesFromFormData(formData));
  if (!parsed.success) return redirectTo(request, `${editPath}?timeline_error=invalid_form`);

  const supabase = await createSupabaseServerClient();
  const { data: property, error: propertyError } = await supabase.from("properties").select("id").eq("id", id).is("deleted_at", null).maybeSingle();
  if (propertyError) {
    console.error("property_timeline_property_lookup_failed", sanitizeTimelineDbError(propertyError));
    return redirectTo(request, `${editPath}?timeline_error=create_failed`);
  }
  if (!property) return redirectTo(request, "/admin/properties?error=not_found");

  const result = await insertPropertyTimelineEvent(supabase, {
    property_id: id,
    event_date: parsed.data.event_date,
    event_type: parsed.data.event_type,
    title: parsed.data.title,
    content: parsed.data.content || null,
    created_by: current.user.id,
    created_by_email: current.user.email || current.profile.email || null
  });

  const redirectPath = timelineCreateRedirectPath(id, result);
  if (result.error || !result.data?.id) {
    console.error("property_timeline_create_failed", sanitizeTimelineDbError(result.error));
    return redirectTo(request, redirectPath);
  }

  revalidatePath(editPath);
  return redirectTo(request, redirectPath);
}
