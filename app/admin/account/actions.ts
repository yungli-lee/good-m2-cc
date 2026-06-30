"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const displayNameSchema = z.string().trim().max(120);
const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

function accountRedirect(params: Record<string, string>): never {
  redirect(`/admin/account?${new URLSearchParams(params).toString()}`);
}

export async function updateOwnDisplayNameAction(formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const parsedDisplayName = displayNameSchema.safeParse(String(formData.get("display_name") || ""));

  if (!parsedDisplayName.success) accountRedirect({ error: "invalid_display_name" });

  const supabase = await createSupabaseServerClient();
  const displayName = parsedDisplayName.data || null;
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", current.user.id);

  if (error) {
    console.error("own_display_name_update_failed", { userId: current.user.id, code: error.code });
    accountRedirect({ error: "profile_update_failed" });
  }

  await recordAuditLog({
    action: "display_name_updated",
    resourceType: "profile",
    resourceId: current.user.id,
    beforeData: { display_name: current.profile.display_name || null },
    afterData: { display_name: displayName },
    userId: current.user.id,
    userEmail: current.user.email,
    actorRole: current.profile.role,
    targetUserId: current.user.id,
    targetEmail: current.user.email,
    result: "success"
  });

  revalidatePath("/admin/account");
  revalidatePath("/admin");
  accountRedirect({ saved: "profile" });
}

export async function changeOwnPasswordAction(formData: FormData) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");
  const email = current.user.email || current.profile.email;

  if (!email) accountRedirect({ error: "missing_email", section: "password" });
  if (newPassword !== confirmPassword) accountRedirect({ error: "password_mismatch", section: "password" });
  if (currentPassword === newPassword) accountRedirect({ error: "password_reused", section: "password" });

  const parsedPassword = passwordSchema.safeParse(newPassword);
  if (!parsedPassword.success) accountRedirect({ error: "weak_password", section: "password" });

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword
  });

  if (verifyError) {
    await recordAuditLog({
      action: "password_change_failed",
      resourceType: "auth",
      resourceId: current.user.id,
      userId: current.user.id,
      userEmail: current.user.email,
      actorRole: current.profile.role,
      targetUserId: current.user.id,
      targetEmail: current.user.email,
      result: "failed",
      reason: "current_password_invalid"
    });
    accountRedirect({ error: "current_password_invalid", section: "password" });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: parsedPassword.data });
  if (updateError) {
    console.error("own_password_update_failed", { userId: current.user.id, status: updateError.status, code: updateError.code });
    accountRedirect({ error: "password_update_failed", section: "password" });
  }

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    console.error("own_password_session_refresh_failed", { userId: current.user.id, status: refreshError.status, code: refreshError.code });
    accountRedirect({ error: "session_refresh_failed", section: "password" });
  }

  await recordAuditLog({
    action: "password_changed",
    resourceType: "auth",
    resourceId: current.user.id,
    afterData: { session_refreshed: true },
    userId: current.user.id,
    userEmail: current.user.email,
    actorRole: current.profile.role,
    targetUserId: current.user.id,
    targetEmail: current.user.email,
    result: "success"
  });

  revalidatePath("/admin/account");
  accountRedirect({ saved: "password", section: "password" });
}
