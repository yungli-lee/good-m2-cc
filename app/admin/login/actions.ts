"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/audit/audit-log";
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
      afterData: { email }
    });
    redirect("/admin/login?error=login_failed");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || !isAdminRole(profile.role)) {
    await recordAuditLog({
      action: "admin_login_failure",
      resourceType: "auth",
      resourceId: data.user.id,
      afterData: { email, reason: "forbidden_role" },
      userId: data.user.id,
      userEmail: data.user.email
    });
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }

  await recordAuditLog({
    action: "admin_login_success",
    resourceType: "auth",
    resourceId: data.user.id,
    userId: data.user.id,
    userEmail: data.user.email
  });

  redirect("/admin/properties");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
