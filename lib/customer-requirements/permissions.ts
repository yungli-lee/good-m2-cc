import type { AdminRole } from "@/types/auth/admin";
export const canViewRequirements=(r:AdminRole)=>["editor","admin","owner"].includes(r);
export const canWriteRequirements=canViewRequirements;
export const canDeleteRequirements=(r:AdminRole)=>r==="admin"||r==="owner";
