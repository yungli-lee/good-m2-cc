import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { canDeleteProperties, canPublishProperties } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { propertySchema, toPropertyPayload } from "@/lib/properties/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { routeIdParamsSchema } from "@/lib/validation/common";

export const runtime = "edge";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);
  const { id } = parsedParams.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("properties").select("*, property_media(*)").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) return apiError("Unable to load property", 500);
  if (!data) return apiError("Not found", 404);
  return NextResponse.json({ data });
}

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);
  const { id } = parsedParams.data;
  const body = await request.json().catch(() => null);
  const parsed = propertySchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid property data", 422);

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (!before || before.deleted_at) return apiError("Not found", 404);
  const role = auth.current!.profile.role;
  if (!canPublishProperties(role) && before.status !== "draft") return apiError("Editor can edit draft properties only", 403);

  const payload = toPropertyPayload(parsed.data);
  const safePayload = canPublishProperties(role) ? payload : { ...payload, status: "draft", is_featured: before.is_featured };
  const { data, error } = await supabase
    .from("properties")
    .update({
      ...safePayload,
      published_at: safePayload.status === "published" && !before.published_at ? new Date().toISOString() : before.published_at,
      updated_by: auth.current!.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return apiError("Unable to update property", 500);
  await recordAuditLog({
    action: "property_update",
    resourceType: "property",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email
  });
  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, { params }: Props) {
  const auth = await requireApiRole(["admin", "owner"]);
  if (auth.response) return auth.response;
  if (!canDeleteProperties(auth.current!.profile.role)) return apiError("Forbidden", 403);
  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);
  const { id } = parsedParams.data;
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (!before) return apiError("Not found", 404);
  const { data, error } = await supabase
    .from("properties")
    .update({ deleted_at: new Date().toISOString(), updated_by: auth.current!.user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return apiError("Unable to delete property", 500);
  await recordAuditLog({
    action: "property_delete",
    resourceType: "property",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email
  });
  return NextResponse.json({ data });
}
