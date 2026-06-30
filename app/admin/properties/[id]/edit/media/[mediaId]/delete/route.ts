import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { canManagePropertyMedia, getCurrentProfile } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string; mediaId: string }>;
};

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

export async function POST(request: NextRequest, { params }: Props) {
  const { id, mediaId } = await params;
  const current = await getCurrentProfile();
  if (!current) return redirectTo(request, "/admin/login");
  if (!canManagePropertyMedia(current.profile.role)) return redirectTo(request, "/admin/login?error=forbidden");

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("property_media").select("*").eq("id", mediaId).eq("property_id", id).maybeSingle();
  if (!before) return redirectTo(request, `/admin/properties/${id}/edit?error=media_not_found`);

  const { data, error } = await supabase
    .from("property_media")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", mediaId)
    .eq("property_id", id)
    .select()
    .single();

  if (error) return redirectTo(request, `/admin/properties/${id}/edit?error=${encodeURIComponent(error.code || "media_delete_failed")}`);

  await tryRecordAuditLog({
    action: "property_image_delete",
    resourceType: "property_media",
    resourceId: mediaId,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath(`/admin/properties/${id}/edit`);
  return redirectTo(request, `/admin/properties/${id}/edit?saved=1`);
}
