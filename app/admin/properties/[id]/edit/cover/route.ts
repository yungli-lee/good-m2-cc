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
  const { data: media } = await supabase
    .from("property_media")
    .select("id,property_id,media_type,thumbnail_url,sort_order,is_cover,deleted_at")
    .eq("id", mediaId)
    .eq("property_id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!media) return redirectTo(request, `/admin/properties/${id}/edit?error=cover_failed`);
  if (media.media_type === "video" && !media.thumbnail_url?.trim()) {
    return redirectTo(request, `/admin/properties/${id}/edit?error=video_poster_missing`);
  }
  if (media.is_cover) return redirectTo(request, `/admin/properties/${id}/edit?saved=1`);

  const { data: previousCover } = await supabase
    .from("property_media")
    .select("id")
    .eq("property_id", id)
    .eq("is_cover", true)
    .is("deleted_at", null)
    .maybeSingle();
  const { error: clearError } = await supabase.from("property_media")
    .update({ is_cover: false })
    .eq("property_id", id)
    .is("deleted_at", null);
  if (clearError) return redirectTo(request, `/admin/properties/${id}/edit?error=cover_failed`);

  const { data, error } = await supabase
    .from("property_media")
    .update({ is_cover: true, updated_at: new Date().toISOString() })
    .eq("id", mediaId)
    .eq("property_id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) {
    if (previousCover?.id) {
      await supabase.from("property_media").update({ is_cover: true })
        .eq("id", previousCover.id).eq("property_id", id).is("deleted_at", null);
    }
    return redirectTo(request, `/admin/properties/${id}/edit?error=cover_failed`);
  }

  await tryRecordAuditLog({
    action: "property_cover_set",
    resourceType: "property_media",
    resourceId: mediaId,
    afterData: { is_cover: true, media: data },
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath(`/admin/properties/${id}/edit`);
  revalidatePath("/");
  revalidatePath("/properties");
  revalidatePath("/properties/[slug]", "page");
  return redirectTo(request, `/admin/properties/${id}/edit?saved=1`);
}
