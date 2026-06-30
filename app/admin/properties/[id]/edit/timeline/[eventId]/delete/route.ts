import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canManagePropertyTimeline, sanitizeTimelineDbError } from "@/lib/properties/timeline";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string; eventId: string }>;
};

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: NextRequest, { params }: Props) {
  const { id, eventId } = await params;
  const editPath = `/admin/properties/${id}/edit`;
  const current = await getCurrentProfile();
  if (!current) return redirectTo(request, "/admin/login");
  if (!canManagePropertyTimeline(current.profile.role)) return redirectTo(request, "/admin/login?error=forbidden");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("property_timeline_events")
    .delete()
    .eq("id", eventId)
    .eq("property_id", id);

  if (error) {
    console.error("property_timeline_delete_failed", sanitizeTimelineDbError(error));
    return redirectTo(request, `${editPath}?timeline_error=delete_failed`);
  }

  revalidatePath(editPath);
  return redirectTo(request, `${editPath}?timeline_deleted=1`);
}
