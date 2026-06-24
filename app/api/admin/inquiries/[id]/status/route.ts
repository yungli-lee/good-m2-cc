import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { inquiryStatusSchema } from "@/lib/inquiries/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { routeIdParamsSchema } from "@/lib/validation/common";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const parsed = inquiryStatusSchema.safeParse(body.status);
  if (!parsed.success || parsed.data === "spam") return apiError("Invalid status", 422);
  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);
  const { id } = parsedParams.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inquiries")
    .update({ status: parsed.data, updated_by: auth.current!.user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return apiError("Unable to update status", 500);
  return NextResponse.json({ data });
}
