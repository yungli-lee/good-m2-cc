import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { summarizeDevice } from "@/lib/security/device";
import { getRequestMeta } from "@/lib/security/request";
import type { AdminRole } from "@/types/auth/admin";

type AuditAction =
  | "property_create" | "property_update" | "property_delete" | "property_publish" | "property_unpublish"
  | "property_featured_change" | "property_image_upload" | "property_image_delete" | "property_cover_set"
  | "inquiry_view" | "inquiry_status_update" | "inquiry_note_create" | "inquiry_mark_spam" | "inquiry_delete"
  | "admin_login_success" | "admin_login_failure" | "admin_logout" | "login_success" | "login_denied"
  | "role_changed" | "user_created" | "user_disabled" | "user_restored" | "display_name_updated" | "failed_permission_attempt";

type AuditResult = "success" | "denied" | "failed";

const sensitiveKey = /password|passcode|secret|token|key|api[_-]?key|authorization|cookie|session|service[_-]?role|bank|id[_-]?number|tax|owner[_-]?phone|private[_-]?phone/i;

export function maskAuditData(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(maskAuditData);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : maskAuditData(child)
    ])
  );
}

export async function recordAuditLog(input: {
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  beforeData?: unknown;
  afterData?: unknown;
  userId?: string;
  userEmail?: string | null;
  actorRole?: AdminRole | string | null;
  targetUserId?: string | null;
  targetEmail?: string | null;
  result?: AuditResult;
  reason?: string | null;
  device?: string | null;
  requestId?: string | null;
  metadata?: unknown;
}) {
  try {
    const supabase = createSupabaseAdminClient();
    const { ipHash, userAgent } = await getRequestMeta();
    let actorRole = input.actorRole || null;
    if (!actorRole && input.userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", input.userId)
        .maybeSingle();

      if (!error) actorRole = data?.role || null;
    }

    const { error } = await supabase.rpc("write_audit_log", {
      p_actor_user_id: input.userId || null,
      p_actor_email: input.userEmail || null,
      p_actor_role: actorRole,
      p_action: input.action,
      p_resource_type: input.resourceType,
      p_resource_id: input.resourceId || null,
      p_target_user_id: input.targetUserId || null,
      p_target_email: input.targetEmail || null,
      p_before_data: maskAuditData(input.beforeData) || null,
      p_after_data: maskAuditData(input.afterData) || null,
      p_result: input.result || "success",
      p_reason: input.reason || null,
      p_ip_hash: ipHash,
      p_user_agent: userAgent.slice(0, 500),
      p_device: input.device || summarizeDevice(userAgent),
      p_request_id: input.requestId || null,
      p_metadata: maskAuditData(input.metadata) || {}
    });

    if (error) {
      console.error("audit_log_write_failed", { action: input.action, resourceType: input.resourceType, code: error.code });
    }
  } catch (error) {
    console.error("audit_log_write_unhandled", {
      action: input.action,
      resourceType: input.resourceType,
      message: error instanceof Error ? error.message : "unknown"
    });
  }
}
