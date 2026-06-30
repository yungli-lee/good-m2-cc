import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { normalizeUnpublishReason } from "@/lib/properties/lifecycle";
import { todayTaipeiDate, tryInsertPropertyTimelineEvent } from "@/lib/properties/timeline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publishStatusSchema, routeIdParamsSchema } from "@/lib/validation/common";

export const runtime = "edge";

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
  const reason = status === "archived"
    ? normalizeUnpublishReason(
        typeof body.unpublish_reason === "string" ? body.unpublish_reason : null,
        typeof body.unpublish_reason_other === "string" ? body.unpublish_reason_other : null
      )
    : null;
  if (status === "archived" && !reason) return apiError("Unpublish reason is required", 422);
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (!before || before.deleted_at) return apiError("Not found", 404);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("properties")
    .update({
      status,
      published_at: status === "published" ? now : null,
      is_featured: status === "archived" ? false : before.is_featured,
      updated_by: auth.current!.user.id,
      updated_at: now
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return apiError("Unable to update publish status", 500);
  await recordAuditLog({
    action: status === "published" ? "republish_property" : "unpublish_property",
    resourceType: "property",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email,
    metadata: reason ? { reason } : {}
  });
  await tryInsertPropertyTimelineEvent(supabase, {
    property_id: id,
    event_date: todayTaipeiDate(),
    event_type: status === "published" ? "published" : "unpublished",
    title: status === "published" && before.status !== "published" ? "重新上架" : status === "published" ? "上架" : "下架",
    content: reason ? `原因：${reason}\n建立者：${auth.current!.user.email || auth.current!.profile.email || "-"}\n操作日期：${todayTaipeiDate().replaceAll("-", "/")}` : data.title,
    created_by: auth.current!.user.id,
    created_by_email: auth.current!.user.email || auth.current!.profile.email || null
  });
  return NextResponse.json({ data });
}
