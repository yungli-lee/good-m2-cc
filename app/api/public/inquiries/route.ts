import { NextResponse } from "next/server";
import { inquirySchema } from "@/lib/inquiries/schema";
import { getRequestMeta } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "edge";

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
  const body = await request.json().catch(() => null);
  const parsed = inquirySchema.safeParse(body);
  const { ipHash, userAgent } = await getRequestMeta();
  const supabase = createSupabaseAdminClient();

  if (!parsed.success) {
    return NextResponse.json({ error: "送出資料格式不正確" }, { status: 422 });
  }

  const input = parsed.data;
  if (input.website) {
    await supabase.from("inquiries").insert({
      form_type: input.form_type,
      status: "spam",
      spam_reason: "honeypot",
      ip_hash: ipHash,
      user_agent: userAgent.slice(0, 500)
    });
    return NextResponse.json({ error: "送出失敗，請稍後再試" }, { status: 400 });
  }

  const turnstile = await verifyTurnstile(input.turnstile_token);
  if (!turnstile.ok) {
    await supabase.from("inquiries").insert({
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
    return NextResponse.json({ error: "送出失敗，請稍後再試" }, { status: 400 });
  }

  const { data: blocklist } = await supabase
    .from("blocklist")
    .select("type,value")
    .eq("is_active", true)
    .is("deleted_at", null);
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
    await supabase.from("inquiries").insert({
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
    return NextResponse.json({ error: "送出失敗，請稍後再試" }, { status: 400 });
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

  if (error) {
    return NextResponse.json({ error: "送出失敗，請稍後再試" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
