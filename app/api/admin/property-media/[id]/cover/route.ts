import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { routeIdParamsSchema } from "@/lib/validation/common";

export const runtime = "edge";

type Props = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Props) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);
  const { id } = parsedParams.data;
  const supabase = await createSupabaseServerClient();
  const { data: media } = await supabase.from("property_media").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!media) return apiError("Not found", 404);
  if (media.media_type === "video" && !media.thumbnail_url?.trim()) return apiError("Video poster is required", 422);
  if (media.is_cover) return NextResponse.json({ data: media });
  const { data: previousCover } = await supabase.from("property_media").select("id")
    .eq("property_id", media.property_id).eq("is_cover", true).is("deleted_at", null).maybeSingle();
  const { error: clearError } = await supabase.from("property_media")
    .update({ is_cover: false, updated_by: auth.current!.user.id })
    .eq("property_id", media.property_id).is("deleted_at", null);
  if (clearError) return apiError("Unable to set cover", 500);
  const { data, error } = await supabase
    .from("property_media")
    .update({ is_cover: true, updated_by: auth.current!.user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("property_id", media.property_id)
    .is("deleted_at", null)
    .select()
    .single();
  if (error) {
    if (previousCover?.id) await supabase.from("property_media").update({ is_cover: true })
      .eq("id", previousCover.id).eq("property_id", media.property_id).is("deleted_at", null);
    return apiError("Unable to set cover", 500);
  }
  await recordAuditLog({
    action: "property_cover_set",
    resourceType: "property_media",
    resourceId: id,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email
  });
  return NextResponse.json({ data });
}
