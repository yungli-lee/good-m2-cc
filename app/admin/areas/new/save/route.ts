import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { areaPageSchema, areaPayload, areaValuesFromFormData } from "@/lib/areas-cms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

const redirectTo = (request: NextRequest, path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });
const canManage = (role: string) => ["editor", "admin", "owner"].includes(role);

export async function POST(request: NextRequest) {
  const current = await getCurrentProfile();
  if (!current) return redirectTo(request, "/admin/login");
  if (!canManage(current.profile.role)) return redirectTo(request, "/admin/login?error=forbidden");

  const parsed = areaPageSchema.safeParse(areaValuesFromFormData(await request.formData()));
  if (!parsed.success) return redirectTo(request, "/admin/areas/new?error=invalid_form");

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const payload = {
    ...areaPayload(parsed.data),
    published_at: parsed.data.status === "published" ? now : null,
    archived_at: parsed.data.status === "archived" ? now : null,
    created_by: current.user.id,
    updated_by: current.user.id
  };
  const { data, error } = await supabase.from("area_pages").insert(payload).select("*").single();
  if (error) return redirectTo(request, `/admin/areas/new?error=${encodeURIComponent(error.code || "create_failed")}`);

  await recordAuditLog({ action: "site_page_create", resourceType: "area_page", resourceId: data.id, afterData: data, userId: current.user.id, userEmail: current.user.email });
  revalidatePath("/areas"); revalidatePath(`/areas/${data.slug}`); revalidatePath("/sitemap.xml"); revalidatePath("/admin/areas");
  return redirectTo(request, `/admin/areas/${data.id}/edit?saved=1`);
}
