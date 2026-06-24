"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canMarkInquirySpam, requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { inquiryStatusSchema } from "@/lib/inquiries/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateInquiryStatusAction(id: string, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const parsed = inquiryStatusSchema.safeParse(String(formData.get("status") || ""));
  if (!parsed.success || parsed.data === "spam") redirect(`/admin/inquiries/${id}?error=invalid_status`);

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("inquiries").select("*").eq("id", id).maybeSingle();
  const { data, error } = await supabase
    .from("inquiries")
    .update({ status: parsed.data, updated_by: current.user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) redirect(`/admin/inquiries/${id}?error=status_failed`);

  await recordAuditLog({
    action: "inquiry_status_update",
    resourceType: "inquiry",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/admin/inquiries");
  redirect(`/admin/inquiries/${id}?saved=1`);
}

export async function updateInquiryNoteAction(id: string, formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const internalNote = String(formData.get("internal_note") || "").trim().slice(0, 4000);
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("inquiries").select("*").eq("id", id).maybeSingle();
  const { data, error } = await supabase
    .from("inquiries")
    .update({ internal_note: internalNote, updated_by: current.user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) redirect(`/admin/inquiries/${id}?error=note_failed`);

  await recordAuditLog({
    action: "inquiry_note_create",
    resourceType: "inquiry",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/admin/inquiries");
  redirect(`/admin/inquiries/${id}?saved=1`);
}

export async function markInquirySpamAction(id: string) {
  const current = await requireRole(["admin", "owner"]);
  if (!canMarkInquirySpam(current.profile.role)) redirect("/admin/login?error=forbidden");
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("inquiries").select("*").eq("id", id).maybeSingle();
  const { data, error } = await supabase
    .from("inquiries")
    .update({ status: "spam", spam_reason: "manual", updated_by: current.user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) redirect(`/admin/inquiries/${id}?error=spam_failed`);

  await recordAuditLog({
    action: "inquiry_mark_spam",
    resourceType: "inquiry",
    resourceId: id,
    beforeData: before,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/admin/inquiries");
  redirect(`/admin/inquiries/${id}?saved=1`);
}
