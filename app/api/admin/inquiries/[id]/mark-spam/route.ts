import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { routeIdParamsSchema } from "@/lib/validation/common";

export const runtime = "edge";

type Props = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Props) {
  const auth = await requireApiRole(["admin", "owner"]);
  if (auth.response) return auth.response;
  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);
  const { id } = parsedParams.data;
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("inquiries").select("*").eq("id", id).maybeSingle();
  const { data, error } = await supabase
    .from("inquiries")
    .update({ status: "spam", spam_reason: "manual", updated_by: auth.current!.user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return apiError("Unable to mark spam", 500);
  await recordAuditLog({
    action: "inquiry_mark_spam",
    resourceType: "inquiry",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email
  });
  return NextResponse.json({ data });
}
