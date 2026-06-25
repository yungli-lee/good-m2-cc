import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { canManagePropertyMedia, getCurrentProfile } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
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
  const mediaId = String(formData.get("media_id") || "");
  if (!mediaId) return redirectTo(request, `/admin/properties/${id}/edit?error=cover_failed`);

  const supabase = await createSupabaseServerClient();
  await supabase.from("property_media").update({ is_cover: false, updated_by: current.user.id }).eq("property_id", id);
  const { data, error } = await supabase
    .from("property_media")
    .update({ is_cover: true, updated_by: current.user.id, updated_at: new Date().toISOString() })
    .eq("id", mediaId)
    .eq("property_id", id)
    .select()
    .single();

  if (error) return redirectTo(request, `/admin/properties/${id}/edit?error=${encodeURIComponent(error.code || "cover_failed")}`);

  await tryRecordAuditLog({
    action: "property_cover_set",
    resourceType: "property_media",
    resourceId: mediaId,
    afterData: { is_cover: true, media: data },
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath(`/admin/properties/${id}/edit`);
  return redirectTo(request, `/admin/properties/${id}/edit?saved=1`);
}
