"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, type AdminRole } from "@/lib/auth";
import {
  canAssignInitialRole,
  canChangeRole,
  canCreateUser,
  canDisableUser,
  canManageUsers,
  canRestoreUser
} from "@/lib/auth/permissions";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation/common";

const roleSchema = z.enum(["viewer", "editor", "admin"]);
const displayNameSchema = z.string().trim().max(120);
const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  display_name: displayNameSchema,
  role: roleSchema,
  password: z.string().min(12).max(128),
  auto_confirm: z.boolean()
});

type ManagedProfile = {
  id: string;
  email: string | null;
  role: AdminRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type RoleChangeFailureReason = "request_failed" | "database_error" | "permission_denied" | "validation_failed";

function safeErrorRedirect(code = "request_failed"): never {
  redirect(`/admin/users?error=${code}`);
}

function sanitizeDatabaseErrorMessage(message?: string) {
  if (!message) return null;
  return message.slice(0, 180);
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
  targetEmail?: string | null;
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
    userEmail: input.actorEmail,
    targetUserId: uuidSchema.safeParse(input.targetId).success ? input.targetId : null,
    targetEmail: input.targetEmail || null,
    result: "denied",
    reason: "permission_denied"
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

async function recordUserRoleChangeAudit(input: {
  current: Awaited<ReturnType<typeof requireRole>>;
  targetId: string;
  targetEmail?: string | null;
  beforeRole?: AdminRole | null;
  attemptedRole?: AdminRole | string | null;
  result: "success" | "failed";
  reason?: RoleChangeFailureReason | null;
  afterRole?: AdminRole | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const targetUserId = uuidSchema.safeParse(input.targetId).success ? input.targetId : null;

  await recordAuditLog({
    action: "user.role_change",
    resourceType: "user",
    resourceId: input.targetId,
    beforeData: {
      before: { role: input.beforeRole || null },
      actor_email: input.current.user.email || null,
      target_email: input.targetEmail || null
    },
    afterData: input.result === "success"
      ? {
          after: { role: input.afterRole || null },
          actor_email: input.current.user.email || null,
          target_email: input.targetEmail || null
        }
      : {
          after_attempted: { role: input.attemptedRole || null },
          error_code: input.errorCode || null,
          error_message_sanitized: sanitizeDatabaseErrorMessage(input.errorMessage || undefined),
          actor_email: input.current.user.email || null,
          target_email: input.targetEmail || null
        },
    userId: input.current.user.id,
    userEmail: input.current.user.email,
    actorRole: input.current.profile.role,
    targetUserId,
    targetEmail: input.targetEmail || null,
    result: input.result,
    reason: input.reason || null,
    metadata: {
      audit_schema: "admin_user_role_change_v1"
    }
  });
}

export async function createUserAction(formData: FormData) {
  const current = await requireRole(["admin", "owner"]);
  const parsed = createUserSchema.safeParse({
    email: String(formData.get("email") || ""),
    display_name: String(formData.get("display_name") || ""),
    role: String(formData.get("role") || "viewer"),
    password: String(formData.get("password") || ""),
    auto_confirm: formData.get("auto_confirm") === "on"
  });

  if (!parsed.success) safeErrorRedirect("invalid_request");
  if (!canCreateUser(current.profile.role) || !canAssignInitialRole(current.profile.role, parsed.data.role)) {
    await recordAuditLog({
      action: "failed_permission_attempt",
      resourceType: "profile",
      resourceId: parsed.data.email,
      afterData: { attempted_action: "user_created", email: parsed.data.email, role: parsed.data.role },
      userId: current.user.id,
      userEmail: current.user.email,
      actorRole: current.profile.role,
      targetEmail: parsed.data.email,
      result: "denied",
      reason: "permission_denied"
    });
    safeErrorRedirect("forbidden");
  }

  let adminSupabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    adminSupabase = createSupabaseAdminClient();
  } catch (error) {
    console.error("admin_client_create_failed", { message: error instanceof Error ? error.message : "unknown" });
    safeErrorRedirect("request_failed");
  }

  const displayName = parsed.data.display_name || null;
  const { data: created, error: createError } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: parsed.data.auto_confirm,
    user_metadata: displayName ? { display_name: displayName } : undefined
  });

  if (createError || !created.user) {
    console.error("admin_user_create_failed", { status: createError?.status, code: createError?.code });
    safeErrorRedirect("request_failed");
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { error: insertProfileError } = await adminSupabase
    .from("profiles")
    .insert({
      id: created.user.id,
      email: created.user.email || parsed.data.email,
      display_name: displayName,
      role: "viewer",
      created_at: now,
      updated_at: now
    });

  if (insertProfileError && insertProfileError.code !== "23505") {
    console.error("created_user_profile_insert_failed", { targetId: created.user.id, code: insertProfileError.code });
  }

  let target = await getTargetProfile(supabase, created.user.id);
  let roleUpdateFailed = false;

  if (target.display_name !== displayName) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq("id", created.user.id)
      .select("id,email,role,display_name,created_at,updated_at,deleted_at")
      .single();

    if (error) {
      console.error("created_user_display_name_update_failed", { targetId: created.user.id, code: error.code });
    } else {
      target = data as ManagedProfile;
    }
  }

  if (parsed.data.role !== "viewer") {
    const activeOwnerCount = await getActiveOwnerCount(supabase);
    if (!canChangeRole(current.profile, target, parsed.data.role, activeOwnerCount)) {
      roleUpdateFailed = true;
    } else {
      const { data, error } = await supabase
        .from("profiles")
        .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
        .eq("id", created.user.id)
        .select("id,email,role,display_name,created_at,updated_at,deleted_at")
        .single();

      if (error) {
        console.error("created_user_role_update_failed", { targetId: created.user.id, code: error.code });
        roleUpdateFailed = true;
      } else {
        target = data as ManagedProfile;
      }
    }
  }

  await recordAuditLog({
    action: "user_created",
    resourceType: "profile",
    resourceId: created.user.id,
    afterData: {
      id: created.user.id,
      email: created.user.email || parsed.data.email,
      display_name: displayName,
      role: target.role,
      requested_role: parsed.data.role,
      auto_confirm: parsed.data.auto_confirm,
      role_update_failed: roleUpdateFailed
    },
    userId: current.user.id,
    userEmail: current.user.email,
    actorRole: current.profile.role,
    targetUserId: created.user.id,
    targetEmail: created.user.email || parsed.data.email,
    result: roleUpdateFailed ? "failed" : "success",
    reason: roleUpdateFailed ? "role_update_failed" : null
  });

  revalidatePath("/admin/users");
  redirect(roleUpdateFailed ? "/admin/users?saved=1&warning=role_pending" : "/admin/users?saved=1");
}

export async function updateUserRoleAction(targetId: string, formData: FormData) {
  const current = await requireRole(["admin", "owner"]);
  const parsedTargetId = uuidSchema.safeParse(targetId);
  const requestedRole = String(formData.get("role") || "");
  const parsedRole = roleSchema.safeParse(requestedRole);

  if (!parsedTargetId.success || !parsedRole.success) {
    await recordUserRoleChangeAudit({
      current,
      targetId,
      attemptedRole: requestedRole,
      result: "failed",
      reason: "validation_failed"
    });
    safeErrorRedirect("invalid_request");
  }

  const supabase = await createSupabaseServerClient();
  const { data: targetData, error: targetError } = await supabase
    .from("profiles")
    .select("id,email,role,display_name,created_at,updated_at,deleted_at")
    .eq("id", parsedTargetId.data)
    .maybeSingle();

  if (targetError) {
    console.error("managed_profile_query_failed", {
      targetId: parsedTargetId.data,
      code: targetError.code,
      message: sanitizeDatabaseErrorMessage(targetError.message)
    });
    await recordUserRoleChangeAudit({
      current,
      targetId: parsedTargetId.data,
      attemptedRole: parsedRole.data,
      result: "failed",
      reason: "database_error",
      errorCode: targetError.code,
      errorMessage: targetError.message
    });
    safeErrorRedirect("request_failed");
  }

  if (!targetData) {
    await recordUserRoleChangeAudit({
      current,
      targetId: parsedTargetId.data,
      attemptedRole: parsedRole.data,
      result: "failed",
      reason: "request_failed"
    });
    safeErrorRedirect("not_found");
  }

  const target = targetData as ManagedProfile;
  const { count: activeOwnerCount, error: ownerCountError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .is("deleted_at", null);

  if (ownerCountError) {
    console.error("owner_count_query_failed", {
      code: ownerCountError.code,
      message: sanitizeDatabaseErrorMessage(ownerCountError.message)
    });
    await recordUserRoleChangeAudit({
      current,
      targetId: parsedTargetId.data,
      targetEmail: target.email,
      beforeRole: target.role,
      attemptedRole: parsedRole.data,
      result: "failed",
      reason: "database_error",
      errorCode: ownerCountError.code,
      errorMessage: ownerCountError.message
    });
    safeErrorRedirect("request_failed");
  }

  if (!canChangeRole(current.profile, target, parsedRole.data, activeOwnerCount || 0)) {
    await recordUserRoleChangeAudit({
      current,
      targetId: parsedTargetId.data,
      targetEmail: target.email,
      beforeRole: target.role,
      attemptedRole: parsedRole.data,
      result: "failed",
      reason: "permission_denied"
    });
    safeErrorRedirect("forbidden");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: parsedRole.data, updated_at: new Date().toISOString() })
    .eq("id", parsedTargetId.data)
    .select("id,email,role,display_name,created_at,updated_at,deleted_at")
    .single();

  if (error) {
    console.error("user_role_update_failed", {
      targetId: parsedTargetId.data,
      code: error.code,
      message: sanitizeDatabaseErrorMessage(error.message)
    });
    await recordUserRoleChangeAudit({
      current,
      targetId: parsedTargetId.data,
      targetEmail: target.email,
      beforeRole: target.role,
      attemptedRole: parsedRole.data,
      result: "failed",
      reason: "database_error",
      errorCode: error.code,
      errorMessage: error.message
    });
    safeErrorRedirect("request_failed");
  }

  await recordUserRoleChangeAudit({
    current,
    targetId: parsedTargetId.data,
    targetEmail: target.email,
    beforeRole: target.role,
    afterRole: (data as ManagedProfile).role,
    result: "success"
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
      targetEmail: target.email,
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
    userEmail: current.user.email,
    actorRole: current.profile.role,
    targetUserId: parsedTargetId,
    targetEmail: target.email,
    result: "success"
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
      targetEmail: target.email,
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
    userEmail: current.user.email,
    actorRole: current.profile.role,
    targetUserId: parsedTargetId,
    targetEmail: target.email,
    result: "success"
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
      targetEmail: target.email,
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
    userEmail: current.user.email,
    actorRole: current.profile.role,
    targetUserId: parsedTargetId,
    targetEmail: target.email,
    result: "success"
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

export async function sendPasswordResetEmailAction(targetId: string) {
  const current = await requireRole(["owner"]);
  const parsedTargetId = parseTargetId(targetId);
  const supabase = await createSupabaseServerClient();
  const target = await getTargetProfile(supabase, parsedTargetId);

  if (target.deleted_at || !target.email) {
    await recordFailedPermissionAttempt({
      actorId: current.user.id,
      actorEmail: current.user.email,
      targetId: parsedTargetId,
      targetEmail: target.email,
      action: "password_reset_email_sent",
      beforeData: { deleted_at: target.deleted_at, has_email: Boolean(target.email) }
    });
    safeErrorRedirect("invalid_request");
  }

  let adminSupabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    adminSupabase = createSupabaseAdminClient();
  } catch (error) {
    console.error("admin_client_create_failed", { message: error instanceof Error ? error.message : "unknown" });
    safeErrorRedirect("request_failed");
  }

  const { error } = await adminSupabase.auth.resetPasswordForEmail(target.email);
  if (error) {
    console.error("password_reset_email_failed", { targetId: parsedTargetId, status: error.status, code: error.code });
    await recordAuditLog({
      action: "password_reset_email_sent",
      resourceType: "auth",
      resourceId: parsedTargetId,
      userId: current.user.id,
      userEmail: current.user.email,
      actorRole: current.profile.role,
      targetUserId: parsedTargetId,
      targetEmail: target.email,
      result: "failed",
      reason: "email_send_failed"
    });
    safeErrorRedirect("request_failed");
  }

  await recordAuditLog({
    action: "password_reset_email_sent",
    resourceType: "auth",
    resourceId: parsedTargetId,
    afterData: { delivery: "email" },
    userId: current.user.id,
    userEmail: current.user.email,
    actorRole: current.profile.role,
    targetUserId: parsedTargetId,
    targetEmail: target.email,
    result: "success"
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=password_reset_email");
}
