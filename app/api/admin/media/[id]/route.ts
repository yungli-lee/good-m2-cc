import { NextResponse } from "next/server";
import { apiError, requireApiRole } from "@/lib/auth-api";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { mediaMetadataSchema } from "@/lib/media/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { routeIdParamsSchema } from "@/lib/validation/common";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;

  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);

  const body = await request.json().catch(() => null);
  const parsed = mediaMetadataSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid request data", 422);

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", parsedParams.data.id)
    .maybeSingle();
  if (!before) return apiError("Not found", 404);

  const { data, error } = await supabase
    .from("media_assets")
    .update({
      alt_text: parsed.data.alt_text || null,
      caption: parsed.data.caption || null,
      usage_type: parsed.data.usage_type,
      updated_by: auth.current!.user.id
    })
    .eq("id", parsedParams.data.id)
    .select("*")
    .single();
  if (error) return apiError("Unable to update media", 500);

  await recordAuditLog({
    action: "media_update",
    resourceType: "media_asset",
    resourceId: data.id,
    beforeData: before,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email,
    actorRole: auth.current!.profile.role
  });

  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, { params }: Props) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;

  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", parsedParams.data.id)
    .maybeSingle();
  if (!before) return apiError("Not found", 404);

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("media_assets")
    .update({
      status: "deleted",
      deleted_at: now,
      deleted_by: auth.current!.user.id,
      updated_by: auth.current!.user.id
    })
    .eq("id", parsedParams.data.id)
    .select("*")
    .single();
  if (error) return apiError("Unable to delete media", 500);

  await recordAuditLog({
    action: "media_delete",
    resourceType: "media_asset",
    resourceId: data.id,
    beforeData: before,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email,
    actorRole: auth.current!.profile.role
  });

  return NextResponse.json({ data });
}
