import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { canPublishProperties } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { propertySchema, toPropertyPayload } from "@/lib/properties/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function GET() {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("properties").select("*, property_media(*)").is("deleted_at", null).order("updated_at", { ascending: false });
  if (error) return apiError("Unable to load properties", 500);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  const parsed = propertySchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid property data", 422);

  const role = auth.current!.profile.role;
  const payload = toPropertyPayload(parsed.data);
  const safePayload = canPublishProperties(role) ? payload : { ...payload, status: "draft", is_featured: false };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      ...safePayload,
      published_at: safePayload.status === "published" ? new Date().toISOString() : null,
      created_by: auth.current!.user.id,
      updated_by: auth.current!.user.id
    })
    .select()
    .single();
  if (error) return apiError("Unable to create property", 500);
  await recordAuditLog({
    action: "property_create",
    resourceType: "property",
    resourceId: data.id,
    afterData: data,
    userId: auth.current!.user.id,
    userEmail: auth.current!.user.email
  });
  return NextResponse.json({ data }, { status: 201 });
}
