import { NextResponse } from "next/server";
import { inquirySchema } from "@/lib/inquiries/schema";
import { getRequestMeta } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "edge";

function jsonError(code: string, status: number, error = "送出失敗，請稍後再試") {
  return NextResponse.json({ error, code }, { status });
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
      return jsonError("validation_error", 422, "送出資料格式不正確");
    }

    const input = parsed.data;
    const { ipHash, userAgent } = await getRequestMeta();

    let supabase: ReturnType<typeof createSupabaseAdminClient>;
    try {
      supabase = createSupabaseAdminClient();
    } catch {
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
      if (error) return jsonError("spam_insert_error", 500);
      return jsonError("honeypot_rejected", 400);
    }

    let turnstile: Awaited<ReturnType<typeof verifyTurnstile>>;
    try {
      turnstile = await verifyTurnstile(input.turnstile_token);
    } catch {
      return jsonError("turnstile_error", 502);
    }

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
      if (error) return jsonError("spam_insert_error", 500);
      return jsonError("turnstile_failed", 400);
    }

    const { data: blocklist, error: blocklistError } = await supabase
      .from("blocklist")
      .select("type,value")
      .eq("is_active", true)
      .is("deleted_at", null);
    if (blocklistError) return jsonError("blocklist_error", 500);

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
      if (error) return jsonError("spam_insert_error", 500);
      return jsonError("blocklist_rejected", 400);
    }

    const { error } = await supabase.from("inquiries").insert({
      form_type: input.form_type,
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      message: input.message,
      property_id: input.property_id || null,
      source_page: input.source_page || null,
      status: "new",
      turnstile_verified: turnstile.ok,
      ip_hash: ipHash,
      user_agent: userAgent.slice(0, 500)
    });
    if (error) return jsonError("supabase_insert_error", 500);

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("server_error", 500, "服務暫時無法使用");
  }
}
