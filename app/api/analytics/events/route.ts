import { NextResponse } from "next/server";
import { analyticsEventRequestSchema } from "@/lib/analytics/schemas";
import { getAnalyticsEnvironment } from "@/lib/analytics/environment";
import { getRequestMeta } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "edge";
const MAX_PAYLOAD_BYTES = 8 * 1024;
const RATE_LIMIT_PER_MINUTE = 60;

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_PAYLOAD_BYTES) return response({ ok: false, error: "payload_too_large" }, 413);
  const raw = await request.text().catch(() => "");
  if (new TextEncoder().encode(raw).length > MAX_PAYLOAD_BYTES) return response({ ok: false, error: "payload_too_large" }, 413);
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return response({ ok: false, error: "invalid_json" }, 400); }
  const parsed = analyticsEventRequestSchema.safeParse(json);
  if (!parsed.success) return response({ ok: false, error: "invalid_event" }, 400);
  if (parsed.data.page_path.startsWith("/admin") || parsed.data.page_path.startsWith("/api")) return response({ ok: false, error: "excluded_path" }, 400);

  try {
    const supabase = createSupabaseAdminClient();
    const { ipHash, userAgent } = await getRequestMeta();
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error: countError } = await supabase.from("rate_limit_events").select("id", { count: "exact", head: true }).eq("scope", "analytics_events").eq("ip_hash", ipHash).gte("created_at", since);
    if (countError) return response({ ok: false, error: "temporarily_unavailable" }, 503);
    if ((count || 0) >= RATE_LIMIT_PER_MINUTE) return response({ ok: false, error: "rate_limited" }, 429);
    const { error: rateError } = await supabase.from("rate_limit_events").insert({ scope: "analytics_events", ip_hash: ipHash });
    if (rateError) return response({ ok: false, error: "temporarily_unavailable" }, 503);

    const event = parsed.data;
    const isBot = /bot|crawler|spider|headless|lighthouse/i.test(userAgent);
    const { error } = await supabase.from("analytics_events").insert({
      event_id: event.event_id, event_name: event.event_name, event_version: event.event_version,
      occurred_at: event.occurred_at, received_at: new Date().toISOString(), visitor_id: event.visitor_id,
      session_id: event.session_id, property_id: event.property_id || null, page_path: event.page_path,
      referrer: event.referrer || null, utm_source: event.utm_source || null, utm_medium: event.utm_medium || null,
      utm_campaign: event.utm_campaign || null, utm_content: event.utm_content || null, utm_term: event.utm_term || null,
      device_type: event.device_class, device_class: isBot ? "bot" : event.device_class,
      source_system: "web_client", environment: getAnalyticsEnvironment(), is_bot: isBot, is_internal: false,
      event_properties: event.event_properties, metadata: event.event_properties,
      entity_type: event.property_id ? "property" : "page", entity_id: event.property_id || null
    });
    if (error?.code === "23505") return response({ ok: true, duplicate: true }, 200);
    if (error) {
      console.error("[analytics_event_insert_failed]", { code: error.code || "unknown" });
      return response({ ok: false, error: "event_store_failed" }, 500);
    }
    return response({ ok: true, duplicate: false }, 202);
  } catch (error) {
    console.error("[analytics_event_failed]", { name: error instanceof Error ? error.name : "unknown" });
    return response({ ok: false, error: "temporarily_unavailable" }, 500);
  }
}
