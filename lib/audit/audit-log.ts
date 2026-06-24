import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestMeta } from "@/lib/security/request";

type AuditAction =
  | "property_create" | "property_update" | "property_delete" | "property_publish" | "property_unpublish"
  | "property_featured_change" | "property_image_upload" | "property_image_delete" | "property_cover_set"
  | "inquiry_view" | "inquiry_status_update" | "inquiry_note_create" | "inquiry_mark_spam" | "inquiry_delete"
  | "admin_login_success" | "admin_login_failure";

const sensitiveKey = /password|passcode|secret|token|api[_-]?key|authorization|cookie|session|service[_-]?role/i;

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : redact(child)
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
}) {
  const supabase = await createSupabaseServerClient();
  const { ipHash, userAgent } = await getRequestMeta();
  await supabase.from("audit_logs").insert({
    user_id: input.userId || null,
    user_email: input.userEmail || null,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId || null,
    before_data: redact(input.beforeData),
    after_data: redact(input.afterData),
    ip_hash: ipHash,
    user_agent: userAgent.slice(0, 500)
  });
}
