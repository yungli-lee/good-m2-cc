"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, type AdminRole } from "@/lib/auth";
import { canChangeRole, canDisableUser, canManageUsers, canRestoreUser } from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation/common";

const roleSchema = z.enum(["viewer", "editor", "admin"]);
const displayNameSchema = z.string().trim().max(120);

type ManagedProfile = {
  id: string;
  email: string | null;
  role: AdminRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function safeErrorRedirect(code = "request_failed"): never {
  redirect(`/admin/users?error=${code}`);
}

async function getActiveOwnerCount(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .is("deleted_at", null);

  if (error) {
    console.error("owner_count_query_failed", { code: error.code });
    safeErrorRedirect("request_failed");
  }

  return count || 0;
}

async function getTargetProfile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  targetId: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,role,display_name,created_at,updated_at,deleted_at")
    .eq("id", targetId)
    .maybeSingle();

  if (error) {
    console.error("managed_profile_query_failed", { targetId, code: error.code });
    safeErrorRedirect("request_failed");
  }

  if (!data) safeErrorRedirect("not_found");
  return data as ManagedProfile;
}

async function recordFailedPermissionAttempt(input: {
  actorId: string;
  actorEmail?: string | null;
  targetId: string;
  action: string;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  await recordAuditLog({
    action: "failed_permission_attempt",
    resourceType: "profile",
    resourceId: input.targetId,
    beforeData: input.beforeData,
    afterData: {
      ...(typeof input.afterData === "object" && input.afterData ? input.afterData : {}),
      attempted_action: input.action
    },
    userId: input.actorId,
    userEmail: input.actorEmail
  });
}

function parseTargetId(targetId: string) {
  const parsed = uuidSchema.safeParse(targetId);
  if (!parsed.success) safeErrorRedirect("invalid_request");
  return parsed.data;
}

function canUpdateDisplayName(actorRole: AdminRole, targetRole: AdminRole) {
  if (!canManageUsers(actorRole)) return false;
  if (actorRole === "owner") return targetRole !== "owner";
  if (actorRole === "admin") return targetRole === "viewer" || targetRole === "editor";
  return false;
}

export async function updateUserRoleAction(targetId: string, formData: FormData) {
  const current = await requireRole(["admin", "owner"]);
  const parsedTargetId = parseTargetId(targetId);
  const parsedRole = roleSchema.safeParse(String(formData.get("role") || ""));
  if (!parsedRole.success) safeErrorRedirect("invalid_request");

  const supabase = await createSupabaseServerClient();
  const target = await getTargetProfile(supabase, parsedTargetId);
  const activeOwnerCount = await getActiveOwnerCount(supabase);

  if (!canChangeRole(current.profile, target, parsedRole.data, activeOwnerCount)) {
    await recordFailedPermissionAttempt({
      actorId: current.user.id,
      actorEmail: current.user.email,
      targetId: parsedTargetId,
      action: "role_changed",
      beforeData: target,
      afterData: { next_role: parsedRole.data }
    });
    safeErrorRedirect("forbidden");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: parsedRole.data, updated_at: new Date().toISOString() })
    .eq("id", parsedTargetId)
    .select("id,email,role,display_name,created_at,updated_at,deleted_at")
    .single();

  if (error) {
    console.error("user_role_update_failed", { targetId: parsedTargetId, code: error.code });
    safeErrorRedirect("request_failed");
  }

  await recordAuditLog({
    action: "role_changed",
    resourceType: "profile",
    resourceId: parsedTargetId,
    beforeData: target,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

export async function disableUserAction(targetId: string) {
  const current = await requireRole(["admin", "owner"]);
  const parsedTargetId = parseTargetId(targetId);
  const supabase = await createSupabaseServerClient();
  const target = await getTargetProfile(supabase, parsedTargetId);
  const activeOwnerCount = await getActiveOwnerCount(supabase);

  if (!canDisableUser(current.profile, target, activeOwnerCount)) {
    await recordFailedPermissionAttempt({
      actorId: current.user.id,
      actorEmail: current.user.email,
      targetId: parsedTargetId,
      action: "user_disabled",
      beforeData: target
    });
    safeErrorRedirect("forbidden");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", parsedTargetId)
    .select("id,email,role,display_name,created_at,updated_at,deleted_at")
    .single();

  if (error) {
    console.error("user_disable_failed", { targetId: parsedTargetId, code: error.code });
    safeErrorRedirect("request_failed");
  }

  await recordAuditLog({
    action: "user_disabled",
    resourceType: "profile",
    resourceId: parsedTargetId,
    beforeData: target,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

export async function restoreUserAction(targetId: string) {
  const current = await requireRole(["admin", "owner"]);
  const parsedTargetId = parseTargetId(targetId);
  const supabase = await createSupabaseServerClient();
  const target = await getTargetProfile(supabase, parsedTargetId);

  if (!canRestoreUser(current.profile, target)) {
    await recordFailedPermissionAttempt({
      actorId: current.user.id,
      actorEmail: current.user.email,
      targetId: parsedTargetId,
      action: "user_restored",
      beforeData: target
    });
    safeErrorRedirect("forbidden");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", parsedTargetId)
    .select("id,email,role,display_name,created_at,updated_at,deleted_at")
    .single();

  if (error) {
    console.error("user_restore_failed", { targetId: parsedTargetId, code: error.code });
    safeErrorRedirect("request_failed");
  }

  await recordAuditLog({
    action: "user_restored",
    resourceType: "profile",
    resourceId: parsedTargetId,
    beforeData: target,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

export async function updateDisplayNameAction(targetId: string, formData: FormData) {
  const current = await requireRole(["admin", "owner"]);
  const parsedTargetId = parseTargetId(targetId);
  const parsedDisplayName = displayNameSchema.safeParse(String(formData.get("display_name") || ""));
  if (!parsedDisplayName.success) safeErrorRedirect("invalid_request");

  const supabase = await createSupabaseServerClient();
  const target = await getTargetProfile(supabase, parsedTargetId);

  if (!canUpdateDisplayName(current.profile.role, target.role)) {
    await recordFailedPermissionAttempt({
      actorId: current.user.id,
      actorEmail: current.user.email,
      targetId: parsedTargetId,
      action: "display_name_updated",
      beforeData: target,
      afterData: { display_name: parsedDisplayName.data }
    });
    safeErrorRedirect("forbidden");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: parsedDisplayName.data || null, updated_at: new Date().toISOString() })
    .eq("id", parsedTargetId)
    .select("id,email,role,display_name,created_at,updated_at,deleted_at")
    .single();

  if (error) {
    console.error("display_name_update_failed", { targetId: parsedTargetId, code: error.code });
    safeErrorRedirect("request_failed");
  }

  await recordAuditLog({
    action: "display_name_updated",
    resourceType: "profile",
    resourceId: parsedTargetId,
    beforeData: target,
    afterData: data,
    userId: current.user.id,
    userEmail: current.user.email
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}
