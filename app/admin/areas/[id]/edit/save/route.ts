import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { areaPageSchema, areaPayload, areaValuesFromFormData } from "@/lib/areas-cms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

const redirectTo = (request: NextRequest, path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });
const canManage = (role: string) => ["editor", "admin", "owner"].includes(role);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getCurrentProfile();
  if (!current) return redirectTo(request, "/admin/login");
  if (!canManage(current.profile.role)) return redirectTo(request, "/admin/login?error=forbidden");

  const parsed = areaPageSchema.safeParse(areaValuesFromFormData(await request.formData()));
  if (!parsed.success) return redirectTo(request, `/admin/areas/${id}/edit?error=invalid_form`);

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("area_pages").select("*").eq("id", id).maybeSingle();
  if (!before) return redirectTo(request, "/admin/areas?error=not_found");

  const now = new Date().toISOString();
  const payload = {
    ...areaPayload(parsed.data),
    published_at: parsed.data.status === "published" ? before.published_at || now : before.published_at,
    archived_at: parsed.data.status === "archived" ? before.archived_at || now : null,
    updated_by: current.user.id,
    updated_at: now
  };
  const { data, error } = await supabase.from("area_pages").update(payload).eq("id", id).select("*").single();
  if (error) return redirectTo(request, `/admin/areas/${id}/edit?error=${encodeURIComponent(error.code || "update_failed")}`);

  await recordAuditLog({ action: "site_page_update", resourceType: "area_page", resourceId: id, beforeData: before, afterData: data, userId: current.user.id, userEmail: current.user.email });
  revalidatePath("/areas"); revalidatePath(`/areas/${before.slug}`); revalidatePath(`/areas/${data.slug}`); revalidatePath("/sitemap.xml"); revalidatePath("/admin/areas");
  return redirectTo(request, `/admin/areas/${id}/edit?saved=1`);
}
