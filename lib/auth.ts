import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/types/auth/admin";
import { isAdminRole } from "@/types/auth/admin";

export type { AdminRole };

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,role,display_name,deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("profile_query_failed", {
      userId: user.id,
      code: error.code
    });
    return null;
  }

  if (profile?.deleted_at) {
    console.warn("disabled_profile_access_denied", { userId: user.id });
    return null;
  }

  return {
    user,
    profile: profile || {
      id: user.id,
      email: user.email || null,
      role: "viewer" as AdminRole,
      display_name: null,
      deleted_at: null
    }
  };
}

export async function requireRole(allowed: AdminRole[]) {
  const current = await getCurrentProfile();
  if (!current) redirect("/admin/login");
  if (!isAdminRole(current.profile.role) || !allowed.includes(current.profile.role)) redirect("/admin/login?error=forbidden");
  return current;
}

export function canManageProperties(role: AdminRole) {
  return ["editor", "admin", "owner"].includes(role);
}

export function canPublishProperties(role: AdminRole) {
  return ["admin", "owner"].includes(role);
}

export function canDeleteProperties(role: AdminRole) {
  return ["admin", "owner"].includes(role);
}

export function canManagePropertyMedia(role: AdminRole) {
  return ["editor", "admin", "owner"].includes(role);
}

export function canViewInquiries(role: AdminRole) {
  return ["editor", "admin", "owner"].includes(role);
}

export function canMarkInquirySpam(role: AdminRole) {
  return ["admin", "owner"].includes(role);
}

export function canManageSensitive(role: AdminRole) {
  return ["admin", "owner"].includes(role);
}

export function canManageRoles(role: AdminRole) {
  return role === "owner";
}
