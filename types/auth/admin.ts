export const adminRoles = ["editor", "admin", "owner"] as const;

export type AdminRole = "viewer" | (typeof adminRoles)[number];

export function isAdminRole(role: string | null | undefined): role is (typeof adminRoles)[number] {
  return Boolean(role && adminRoles.includes(role as (typeof adminRoles)[number]));
}
