import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminRole = "viewer" | "editor" | "admin" | "owner";

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile || { id: user.id, email: user.email, role: "viewer" as AdminRole }
  };
}

export async function requireRole(allowed: AdminRole[]) {
  const current = await getCurrentProfile();
  if (!current) redirect("/admin/login");
  if (!allowed.includes(current.profile.role as AdminRole)) redirect("/admin/login?error=forbidden");
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
