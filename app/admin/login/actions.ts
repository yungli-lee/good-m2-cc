"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { getRequestMeta } from "@/lib/security/request";
import { summarizeDevice } from "@/lib/security/device";
import { isAdminRole } from "@/types/auth/admin";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    redirect("/admin/login?error=login_failed");
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    if (error instanceof Error && error.message === "auth_not_configured") {
      redirect("/admin/login?error=auth_not_configured");
    }
    throw error;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await recordAuditLog({
      action: "admin_login_failure",
      resourceType: "auth",
      resourceId: email,
      afterData: { email },
      result: "failed",
      reason: "invalid_credentials"
    });
    redirect("/admin/login?error=login_failed");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,deleted_at")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("login_profile_query_failed", { userId: data.user.id, code: profileError.code });
    redirect("/admin/login?error=login_failed");
  }

  if (profile?.deleted_at) {
    await recordAuditLog({
      action: "login_denied",
      resourceType: "auth",
      resourceId: data.user.id,
      afterData: { email, reason: "disabled_profile" },
      userId: data.user.id,
      userEmail: data.user.email,
      actorRole: profile.role,
      result: "denied",
      reason: "disabled_profile"
    });
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }

  const { ipHash, userAgent } = await getRequestMeta();
  const loginAt = new Date().toISOString();
  const { error: trackingError } = await supabase
    .from("profiles")
    .update({
      last_login_at: loginAt,
      last_login_ip_hash: ipHash,
      last_login_user_agent: userAgent.slice(0, 500),
      last_login_device: summarizeDevice(userAgent),
      updated_at: loginAt
    })
    .eq("id", data.user.id);

  if (trackingError) {
    console.error("login_tracking_update_failed", { userId: data.user.id, code: trackingError.code });
  }

  if (!profile || !isAdminRole(profile.role)) {
    await recordAuditLog({
      action: "login_success",
      resourceType: "auth",
      resourceId: data.user.id,
      afterData: { email, pending_access: true },
      userId: data.user.id,
      userEmail: data.user.email,
      actorRole: profile?.role || "viewer",
      result: "success"
    });
    redirect("/admin/pending");
  }

  await recordAuditLog({
    action: "login_success",
    resourceType: "auth",
    resourceId: data.user.id,
    afterData: { email },
    userId: data.user.id,
    userEmail: data.user.email,
    actorRole: profile.role,
    result: "success"
  });

  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    await recordAuditLog({
      action: "admin_logout",
      resourceType: "auth",
      resourceId: user.id,
      userId: user.id,
      userEmail: user.email,
      actorRole: profile?.role || null,
      result: "success"
    });
  }
  await supabase.auth.signOut();
  redirect("/admin/login");
}
