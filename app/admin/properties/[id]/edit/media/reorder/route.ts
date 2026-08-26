import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { canManagePropertyMedia, getCurrentProfile } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { validateMediaOrder } from "@/lib/properties/media-order";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentProfile();
  if (!current) return errorResponse("請重新登入後再試。", 401);
  if (!canManagePropertyMedia(current.profile.role)) return errorResponse("此帳號沒有調整媒體排序的權限。", 403);

  const { id: propertyId } = await params;
  const body = await request.json().catch(() => null) as { ordered_ids?: unknown } | null;
  if (!body) return errorResponse("排序資料格式不正確。", 400);

  const supabase = await createSupabaseServerClient();
  const { data: rows, error: readError } = await supabase
    .from("property_media")
    .select("id,property_id,sort_order,is_cover,deleted_at")
    .eq("property_id", propertyId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (readError) return errorResponse("目前無法讀取媒體順序，請稍後再試。", 500);
  const normalized = validateMediaOrder(body.ordered_ids, rows || [], propertyId);
  if (!normalized) return errorResponse("排序內容與目前媒體不一致，請重新整理後再試。", 422);

  const original = (rows || []).map((row) => ({ id: row.id, sort_order: Number(row.sort_order || 0) }));
  for (const item of normalized) {
    const { error } = await supabase
      .from("property_media")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id)
      .eq("property_id", propertyId)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      for (const previous of original) {
        await supabase.from("property_media").update({ sort_order: previous.sort_order })
          .eq("id", previous.id).eq("property_id", propertyId).is("deleted_at", null);
      }
      return errorResponse("排序儲存失敗，已恢復原順序。", 500);
    }
  }

  await recordAuditLog({
    action: "media_update",
    resourceType: "property_media_order",
    resourceId: propertyId,
    beforeData: original,
    afterData: normalized,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath(`/admin/properties/${propertyId}/edit`);
  revalidatePath("/");
  revalidatePath("/properties");
  revalidatePath("/properties/[slug]", "page");
  return NextResponse.json({ data: normalized });
}
