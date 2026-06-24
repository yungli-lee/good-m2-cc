import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { routeIdParamsSchema } from "@/lib/validation/common";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);
  const { id } = parsedParams.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("inquiries").select("*, properties(title, slug)").eq("id", id).maybeSingle();
  if (error) return apiError("Unable to load inquiry", 500);
  if (!data) return apiError("Not found", 404);
  return NextResponse.json({ data });
}
