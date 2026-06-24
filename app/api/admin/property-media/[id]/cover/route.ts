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
  const { data: media } = await supabase.from("property_media").select("*").eq("id", id).maybeSingle();
  if (!media) return apiError("Not found", 404);
  await supabase.from("property_media").update({ is_cover: false, updated_by: auth.current!.user.id }).eq("property_id", media.property_id);
  const { data, error } = await supabase
    .from("property_media")
    .update({ is_cover: true, updated_by: auth.current!.user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return apiError("Unable to set cover", 500);
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
