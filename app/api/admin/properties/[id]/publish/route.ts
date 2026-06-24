import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publishStatusSchema, routeIdParamsSchema } from "@/lib/validation/common";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const auth = await requireApiRole(["admin", "owner"]);
  if (auth.response) return auth.response;
  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);
  const body = await request.json().catch(() => ({}));
  const parsedBody = publishStatusSchema.safeParse(body);
  if (!parsedBody.success) return apiError("Invalid request data", 422);
  const { id } = parsedParams.data;
  const { status } = parsedBody.data;
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (!before) return apiError("Not found", 404);
  const { data, error } = await supabase
    .from("properties")
    .update({
      status,
      published_at: status === "published" && !before.published_at ? new Date().toISOString() : before.published_at,
      updated_by: auth.current!.user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return apiError("Unable to update publish status", 500);
  await recordAuditLog({
    action: status === "published" ? "property_publish" : "property_unpublish",
    resourceType: "property",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email
  });
  return NextResponse.json({ data });
}
