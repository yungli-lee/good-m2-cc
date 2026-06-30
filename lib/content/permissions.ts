import type { AdminRole } from "@/lib/auth";
import type { ContentItem } from "@/lib/content/types";

export function canReadContentAdmin(role: AdminRole) {
  return role === "editor" || role === "admin" || role === "owner";
}

export function canCreateKnowledge(role: AdminRole) {
  return role === "editor" || role === "admin" || role === "owner";
}

export function canEditKnowledge(role: AdminRole, item: Pick<ContentItem, "status" | "deleted_at">) {
  if (role === "admin" || role === "owner") return true;
  return role === "editor" && item.status === "draft" && !item.deleted_at;
}

export function canPublishKnowledge(role: AdminRole) {
  return role === "admin" || role === "owner";
}

export function canDeleteKnowledge(role: AdminRole) {
  return role === "admin" || role === "owner";
}

