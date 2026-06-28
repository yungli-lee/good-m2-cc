import type { AdminRole } from "@/types/auth/admin";

export type UserPermissionProfile = {
  id: string;
  role: AdminRole;
  deleted_at?: string | null;
};

export function canManageUsers(role: AdminRole) {
  return role === "admin" || role === "owner";
}

function isActiveOwner(profile: UserPermissionProfile) {
  return profile.role === "owner" && !profile.deleted_at;
}

function isViewerOrEditor(role: AdminRole) {
  return role === "viewer" || role === "editor";
}

export function canCreateUser(role: AdminRole) {
  return role === "admin" || role === "owner";
}

export function canAssignInitialRole(actorRole: AdminRole, nextRole: AdminRole) {
  if (nextRole === "owner") return false;
  if (actorRole === "owner") return nextRole === "viewer" || nextRole === "editor" || nextRole === "admin";
  if (actorRole === "admin") return nextRole === "viewer" || nextRole === "editor";
  return false;
}

export function canChangeRole(
  actor: UserPermissionProfile,
  target: UserPermissionProfile,
  nextRole: AdminRole,
  activeOwnerCount: number
) {
  if (!canManageUsers(actor.role) || target.deleted_at) return false;
  if (nextRole === "owner") return false;
  if (isActiveOwner(actor) && actor.id === target.id && target.role === "owner") return false;
  if (isActiveOwner(target) && activeOwnerCount <= 1) return false;

  if (actor.role === "owner") {
    return target.role !== "owner";
  }

  if (actor.role === "admin") {
    return isViewerOrEditor(target.role) && isViewerOrEditor(nextRole);
  }

  return false;
}

export function canDisableUser(
  actor: UserPermissionProfile,
  target: UserPermissionProfile,
  activeOwnerCount: number
) {
  if (!canManageUsers(actor.role) || target.deleted_at) return false;
  if (actor.id === target.id) return false;
  if (isActiveOwner(target) && activeOwnerCount <= 1) return false;

  if (actor.role === "owner") {
    return target.role !== "owner";
  }

  if (actor.role === "admin") {
    return isViewerOrEditor(target.role);
  }

  return false;
}

export function canRestoreUser(actor: UserPermissionProfile, target: UserPermissionProfile) {
  if (!canManageUsers(actor.role) || !target.deleted_at) return false;

  if (actor.role === "owner") {
    return target.role !== "owner";
  }

  if (actor.role === "admin") {
    return isViewerOrEditor(target.role);
  }

  return false;
}
