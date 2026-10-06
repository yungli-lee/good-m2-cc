"use server";

import { redirect } from "next/navigation";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { sendDiagnosticsEmail } from "@/lib/email/diagnostics";
import { requireRole } from "@/lib/auth";

function actorEmail(current: Awaited<ReturnType<typeof requireRole>>) {
  return current.user.email || current.profile.email || null;
}

export async function sendTestEmailAction() {
  const current = await requireRole(["admin", "owner"]);
  const email = actorEmail(current);
  const result = await sendDiagnosticsEmail(email);

  await recordAuditLog({
    action: result.ok ? "email_test_sent" : "email_test_failed",
    resourceType: "email",
    resourceId: "resend",
    afterData: {
      provider: "Resend",
      delivery_id: result.id || null
    },
    result: result.ok ? "success" : "failed",
    reason: result.ok ? null : result.safeMessage || result.errorCode || "email_test_failed",
    metadata: {
      status: result.status || null,
      error_code: result.errorCode || null
    },
    userId: current.user.id,
    userEmail: email,
    actorRole: current.profile.role
  });

  const params = new URLSearchParams();
  params.set(result.ok ? "sent" : "error", result.ok ? "1" : result.errorCode || "send_failed");
  if (!result.ok && result.safeMessage) params.set("message", result.safeMessage);
  redirect(`/admin/system/email?${params.toString()}`);
}
