import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { routeIdParamsSchema } from "@/lib/validation/common";

type Props = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Props) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);
  const { id } = parsedParams.data;
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("property_media").select("*").eq("id", id).maybeSingle();
  if (!before) return apiError("Not found", 404);
  const { data, error } = await supabase
    .from("property_media")
    .update({ deleted_at: new Date().toISOString(), updated_by: auth.current!.user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return apiError("Unable to delete media", 500);
  await recordAuditLog({
    action: "property_image_delete",
    resourceType: "property_media",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email
  });
  return NextResponse.json({ data });
}
