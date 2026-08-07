import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { sendInquiryNotification } from "@/lib/email/inquiry";
import { inquirySchema } from "@/lib/inquiries/schema";
import { getRequestMeta } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { attributeInquiry } from "@/lib/analytics/lead-attribution";

export const runtime = "edge";

type FieldErrorKey = "name" | "phone" | "email" | "message";

const fieldErrorMessages: Record<FieldErrorKey, string> = {
  name: "請輸入正確姓名",
  phone: "請輸入正確手機號碼",
  email: "請輸入正確 Email",
  message: "請簡單描述您的需求，至少 10 個字"
};

function jsonError(code: string, status: number, error = "送出失敗，請稍後再試", details: Record<string, unknown> = {}) {
  return NextResponse.json({ error, code, ...details }, { status });
}

function safeErrorSummary(error: unknown) {
  if (!error || typeof error !== "object") return { message: String(error || "unknown") };
  const record = error as Record<string, unknown>;
  return {
    name: typeof record.name === "string" ? record.name : undefined,
    message: typeof record.message === "string" ? record.message.slice(0, 240) : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "number" ? record.status : undefined
  };
}

function validationFieldErrors(issues: Array<{ path: Array<string | number>; message: string }>) {
  return issues.reduce<Partial<Record<FieldErrorKey, string>>>((errors, issue) => {
    const field = issue.path[0];
    if (field === "name" || field === "phone" || field === "email" || field === "message") {
      errors[field] ||= issue.message || fieldErrorMessages[field];
    }
    return errors;
  }, {});
}

async function verifyTurnstile(token?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, skipped: false };

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token })
  });
  const result = await response.json().catch(() => ({ success: false }));
  return { ok: Boolean(result.success), skipped: false };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = inquirySchema.safeParse(body);

    if (!parsed.success) {
      console.info("[public_inquiries_validate_failed]", { issue_count: parsed.error.issues.length });
      return jsonError("validation_error", 422, "送出資料格式不正確", {
        field_errors: validationFieldErrors(parsed.error.issues)
      });
    }

    const input = parsed.data;
    console.info("[public_inquiries_validate_ok]", { form_type: input.form_type, has_property_id: Boolean(input.property_id) });
    const { ipHash, userAgent } = await getRequestMeta();

    let supabase: ReturnType<typeof createSupabaseAdminClient>;
    try {
      const supabaseEnv = getSupabaseEnv();
      console.info("[public_inquiries_admin_client_config]", {
        has_url: Boolean(supabaseEnv.url),
        has_service_role: Boolean(supabaseEnv.serviceRoleKey),
        key_source: supabaseEnv.serviceRoleKey ? "service_role" : "missing"
      });
      supabase = createSupabaseAdminClient();
    } catch (error) {
      console.error("[public_inquiries_supabase_client_failed]", safeErrorSummary(error));
      return jsonError("missing_env", 500, "服務暫時無法使用");
    }

    if (input.website) {
      const { error } = await supabase.from("inquiries").insert({
        form_type: input.form_type,
        status: "spam",
        spam_reason: "honeypot",
        ip_hash: ipHash,
        user_agent: userAgent.slice(0, 500)
      });
      if (error) console.error("[public_inquiries_honeypot_insert_failed]", safeErrorSummary(error));
      if (error) return jsonError("spam_insert_error", 500);
      console.info("[public_inquiries_honeypot_rejected]", { form_type: input.form_type });
      return jsonError("honeypot_rejected", 400);
    }

    let turnstile: Awaited<ReturnType<typeof verifyTurnstile>>;
    try {
      turnstile = await verifyTurnstile(input.turnstile_token);
    } catch (error) {
      console.error("[public_inquiries_turnstile_failed]", safeErrorSummary(error));
      return jsonError("turnstile_error", 502);
    }
    console.info("[public_inquiries_turnstile_checked]", { ok: turnstile.ok, skipped: turnstile.skipped });

    if (!turnstile.ok) {
      const { error } = await supabase.from("inquiries").insert({
        form_type: input.form_type,
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        message: input.message,
        property_id: input.property_id || null,
        source_page: input.source_page || null,
        status: "turnstile_failed",
        spam_reason: "turnstile",
        turnstile_verified: false,
        ip_hash: ipHash,
        user_agent: userAgent.slice(0, 500)
      });
      if (error) console.error("[public_inquiries_turnstile_insert_failed]", safeErrorSummary(error));
      if (error) return jsonError("spam_insert_error", 500);
      console.info("[public_inquiries_turnstile_rejected]", { form_type: input.form_type });
      return jsonError("turnstile_failed", 400);
    }

    const { data: blocklist, error: blocklistError } = await supabase
      .from("blocklist")
      .select("type,value")
      .eq("is_active", true)
      .is("deleted_at", null);
    if (blocklistError) {
      console.error("[public_inquiries_blocklist_failed]", safeErrorSummary(blocklistError));
      console.info("[public_inquiries_blocklist_fail_open]", { reason: "blocklist_query_failed" });
    }
    console.info("[public_inquiries_blocklist_checked]", { rule_count: blocklist?.length || 0 });

    const email = (input.email || "").toLowerCase();
    const message = input.message.toLowerCase();
    const blocked = (blocklist || []).some((item) => {
      const value = String(item.value || "").toLowerCase();
      if (item.type === "email") return email && email === value;
      if (item.type === "ip") return ipHash === value;
      if (item.type === "keyword") return value && message.includes(value);
      return false;
    });

    if (blocked) {
      const { error } = await supabase.from("inquiries").insert({
        form_type: input.form_type,
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        message: input.message,
        property_id: input.property_id || null,
        source_page: input.source_page || null,
        status: "spam",
        spam_reason: "blocklist",
        turnstile_verified: turnstile.ok,
        ip_hash: ipHash,
        user_agent: userAgent.slice(0, 500)
      });
      if (error) console.error("[public_inquiries_blocked_insert_failed]", safeErrorSummary(error));
      if (error) return jsonError("spam_insert_error", 500);
      console.info("[public_inquiries_blocklist_rejected]", { form_type: input.form_type });
      return jsonError("blocklist_rejected", 400);
    }

    console.info("[public_inquiries_insert_start]", { form_type: input.form_type, has_property_id: Boolean(input.property_id) });
    const { data: inquiry, error } = await supabase.from("inquiries").insert({
      form_type: input.form_type,
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      message: input.message,
      property_id: input.property_id || null,
      source_page: input.source_page || null,
      visitor_id: input.visitor_id || null,
      session_id: input.session_id || null,
      attribution_status: input.visitor_id && input.session_id ? "pending" : "missing",
      status: "new",
      turnstile_verified: turnstile.ok,
      ip_hash: ipHash,
      user_agent: userAgent.slice(0, 500)
    }).select("id,visitor_id,session_id,property_id,source_page,created_at").single();
    if (error) {
      console.error("[inquiry_insert_failed]", safeErrorSummary(error));
      return NextResponse.json({ ok: false, error: "送出失敗，請稍後再試。", code: "inquiry_failed" }, { status: 500 });
    }
    console.info("[public_inquiries_insert_ok]", { inquiry_id: inquiry.id });

    // Awaited on Edge so the request lifecycle is deterministic. Failures are
    // contained by the service and never change the successful inquiry result.
    const attribution = await attributeInquiry(supabase, inquiry);

    try {
      console.info("[public_inquiries_audit_start]", { action: "inquiry_create", inquiry_id: inquiry.id });
      await recordAuditLog({
        action: "inquiry_create",
        resourceType: "inquiry",
        resourceId: inquiry.id,
        afterData: {
          form_type: input.form_type,
          name: input.name,
          phone: input.phone,
          email: input.email || null,
          property_id: input.property_id || null,
          source_page: input.source_page || null,
          status: "new"
        },
        result: "success"
      });
      console.info("[public_inquiries_audit_ok]", { action: "inquiry_create", inquiry_id: inquiry.id });
    } catch (auditError) {
      console.error("[public_inquiries_audit_failed]", {
        action: "inquiry_create",
        inquiry_id: inquiry.id,
        error: safeErrorSummary(auditError)
      });
    }

    let emailResult: Awaited<ReturnType<typeof sendInquiryNotification>>;
    try {
      console.info("[public_inquiries_email_start]", { inquiry_id: inquiry.id });
      emailResult = await sendInquiryNotification({
        id: inquiry.id,
        formType: input.form_type,
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        message: input.message,
        propertyId: input.property_id || null,
        sourcePage: input.source_page || null
      });
    } catch (emailError) {
      emailResult = {
        ok: false,
        errorCode: "email_send_unhandled",
        safeMessage: "Unhandled email send failure"
      };
      console.error("[inquiry_email_failed]", {
        inquiry_id: inquiry.id,
        error: safeErrorSummary(emailError)
      });
    }

    if (emailResult.ok) {
      console.info("[public_inquiries_email_ok]", { inquiry_id: inquiry.id, delivery_id: emailResult.id || null });
    } else {
      console.error("[inquiry_email_failed]", {
        inquiry_id: inquiry.id,
        code: emailResult.errorCode || null,
        status: emailResult.status || null,
        message: emailResult.safeMessage || "email_send_failed"
      });
    }

    try {
      const action = emailResult.ok ? "inquiry_email_sent" : "inquiry_email_failed";
      console.info("[public_inquiries_audit_start]", { action, inquiry_id: inquiry.id });
      await recordAuditLog({
        action,
        resourceType: "inquiry",
        resourceId: inquiry.id,
        afterData: {
          provider: "Resend",
          delivery_id: emailResult.id || null
        },
        result: emailResult.ok ? "success" : "failed",
        reason: emailResult.ok ? null : emailResult.safeMessage || emailResult.errorCode || "email_send_failed",
        metadata: {
          status: emailResult.status || null,
          error_code: emailResult.errorCode || null
        }
      });
      console.info("[public_inquiries_audit_ok]", { action, inquiry_id: inquiry.id });
    } catch (auditError) {
      console.error("[public_inquiries_audit_failed]", {
        action: emailResult.ok ? "inquiry_email_sent" : "inquiry_email_failed",
        inquiry_id: inquiry.id,
        error: safeErrorSummary(auditError)
      });
    }

    return NextResponse.json({ ok: true, inquiry_id: inquiry.id, attribution_status: attribution.status, email_sent: emailResult.ok });
  } catch (error) {
    console.error("[public_inquiries_failed]", safeErrorSummary(error));
    return NextResponse.json({ ok: false, error: "送出失敗，請稍後再試。", code: "inquiry_failed" }, { status: 500 });
  }
}
