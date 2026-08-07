import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnalyticsEnvironment } from "@/lib/analytics/environment";
import { selectAttributionTouches, touchSource, type AttributionTouch } from "@/lib/analytics/attribution-rules";

type InquiryForAttribution = {
  id: string;
  visitor_id: string | null;
  session_id: string | null;
  property_id: string | null;
  source_page: string | null;
  created_at: string;
};

async function setStatus(supabase: SupabaseClient, inquiryId: string, status: "complete" | "partial" | "missing" | "failed") {
  await supabase.from("inquiries").update({ attribution_status: status }).eq("id", inquiryId);
}

async function createInquiryEvent(supabase: SupabaseClient, inquiry: InquiryForAttribution, status: string) {
  const environment = getAnalyticsEnvironment();
  const { error } = await supabase.from("analytics_events").insert({
    event_id: inquiry.id, event_name: "inquiry_created", event_version: 1,
    occurred_at: inquiry.created_at, received_at: new Date().toISOString(), visitor_id: inquiry.visitor_id,
    session_id: inquiry.session_id, inquiry_id: inquiry.id, property_id: inquiry.property_id,
    page_path: inquiry.source_page, source_system: "public_api", environment,
    is_bot: false, is_internal: false, device_class: "unknown", device_type: "unknown",
    event_properties: { attribution_status: status }, metadata: { attribution_status: status },
    entity_type: "inquiry", entity_id: inquiry.id
  });
  if (error && error.code !== "23505") console.error("[inquiry_created_event_failed]", { inquiry_id: inquiry.id, code: error.code || "unknown" });
}

export async function attributeInquiry(supabase: SupabaseClient, inquiry: InquiryForAttribution) {
  try {
    const existing = await supabase.from("lead_attributions").select("id,attribution_status").eq("inquiry_id", inquiry.id).maybeSingle();
    if (existing.data) {
      await setStatus(supabase, inquiry.id, existing.data.attribution_status as "complete" | "partial" | "missing");
      await createInquiryEvent(supabase, inquiry, existing.data.attribution_status);
      return { status: existing.data.attribution_status, duplicate: true };
    }
    if (!inquiry.visitor_id || !inquiry.session_id) {
      await setStatus(supabase, inquiry.id, "missing");
      await createInquiryEvent(supabase, inquiry, "missing");
      return { status: "missing", duplicate: false };
    }

    const environment = getAnalyticsEnvironment();
    const lookback = new Date(new Date(inquiry.created_at).getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const columns = "id,event_id,session_id,property_id,utm_source,utm_medium,utm_campaign,occurred_at";
    const [visitorResult, sessionResult] = await Promise.all([
      supabase.from("analytics_events").select(columns).eq("environment", environment).eq("visitor_id", inquiry.visitor_id).eq("is_bot", false).eq("is_internal", false).gte("occurred_at", lookback).lte("occurred_at", inquiry.created_at).order("occurred_at", { ascending: true }).limit(500),
      supabase.from("analytics_events").select(columns).eq("environment", environment).eq("session_id", inquiry.session_id).eq("is_bot", false).eq("is_internal", false).gte("occurred_at", lookback).lte("occurred_at", inquiry.created_at).order("occurred_at", { ascending: true }).limit(200)
    ]);
    if (visitorResult.error || sessionResult.error) throw new Error("attribution_event_query_failed");
    const visitorEvents = (visitorResult.data || []) as AttributionTouch[];
    const sessionEvents = (sessionResult.data || []) as AttributionTouch[];
    if (!visitorEvents.length) {
      await setStatus(supabase, inquiry.id, "missing");
      await createInquiryEvent(supabase, inquiry, "missing");
      return { status: "missing", duplicate: false };
    }

    const { first, lead, lastNonDirect } = selectAttributionTouches(visitorEvents, sessionEvents);
    if (!first) throw new Error("attribution_first_touch_missing");
    if (!lead) {
      await setStatus(supabase, inquiry.id, "partial");
      await createInquiryEvent(supabase, inquiry, "partial");
      return { status: "partial", duplicate: false };
    }
    const status = first && lead ? "complete" : "partial";
    const { error } = await supabase.from("lead_attributions").insert({
      inquiry_id: inquiry.id, visitor_id: inquiry.visitor_id, session_id: inquiry.session_id,
      property_id: inquiry.property_id || lead.property_id || first.property_id || null,
      first_touch_event_id: first.id, lead_touch_event_id: lead.id, last_non_direct_event_id: lastNonDirect?.id || null,
      first_source: touchSource(first), first_medium: first.utm_medium, first_campaign: first.utm_campaign,
      lead_source: touchSource(lead), lead_medium: lead.utm_medium, lead_campaign: lead.utm_campaign,
      last_source: lastNonDirect ? touchSource(lastNonDirect) : null, last_medium: lastNonDirect?.utm_medium || null, last_campaign: lastNonDirect?.utm_campaign || null,
      first_seen_at: first.occurred_at, inquiry_at: inquiry.created_at, attribution_status: status
    });
    if (error && error.code !== "23505") throw new Error(`attribution_insert_failed:${error.code || "unknown"}`);
    await setStatus(supabase, inquiry.id, status);
    await createInquiryEvent(supabase, inquiry, status);
    return { status, duplicate: error?.code === "23505" };
  } catch (error) {
    await setStatus(supabase, inquiry.id, "failed");
    console.error("[inquiry_attribution_failed]", { inquiry_id: inquiry.id, reason: error instanceof Error ? error.message.slice(0, 120) : "unknown" });
    await createInquiryEvent(supabase, inquiry, "failed");
    return { status: "failed", duplicate: false };
  }
}
