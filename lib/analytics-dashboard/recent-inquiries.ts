import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AnalyticsRangePreset, DashboardEnvironment } from "./contracts.ts";
import { getAnalyticsPeriod } from "./date-range.ts";
import { joinRecentInquiryAttributions, type InquiryPropertyRow, type LeadAttributionRow, type SafeInquiryRow } from "./recent-inquiry-attribution.ts";

export const RECENT_INQUIRY_LIMIT = 20;
const ATTRIBUTION_COLUMNS = "inquiry_id,property_id,attribution_status,first_source,first_medium,first_campaign,lead_source,lead_medium,lead_campaign,last_source,last_medium,last_campaign,first_seen_at,inquiry_at";

export async function getAnalyticsRecentInquiries(range: AnalyticsRangePreset, environment: DashboardEnvironment) {
  const supabase = await createSupabaseServerClient();
  const period = getAnalyticsPeriod(range);
  const { data: inquiryData, error: inquiryError } = await supabase.from("inquiries")
    .select("id,property_id,created_at,attribution_status")
    .is("deleted_at", null).gte("created_at", period.start).lt("created_at", period.end)
    .order("created_at", { ascending: false }).order("id", { ascending: true }).limit(RECENT_INQUIRY_LIMIT);
  if (inquiryError) throw new Error(`analytics_recent_inquiries_failed:${inquiryError.code || "unknown"}`);
  const inquiries = (inquiryData || []) as SafeInquiryRow[];
  const inquiryIds = inquiries.map((row) => row.id);
  const { data: attributionData, error: attributionError } = inquiryIds.length
    ? await supabase.from("lead_attributions").select(ATTRIBUTION_COLUMNS).in("inquiry_id", inquiryIds)
    : { data: [], error: null };
  if (attributionError) throw new Error(`analytics_recent_attributions_failed:${attributionError.code || "unknown"}`);
  const attributions = (attributionData || []) as LeadAttributionRow[];
  const propertyIds = [...new Set([...inquiries.map((row) => row.property_id), ...attributions.map((row) => row.property_id)].filter((id): id is string => Boolean(id)))];
  const { data: propertyData, error: propertyError } = propertyIds.length
    ? await supabase.from("properties").select("id,title,slug,status").in("id", propertyIds)
    : { data: [], error: null };
  if (propertyError) throw new Error(`analytics_recent_properties_failed:${propertyError.code || "unknown"}`);
  return {
    range, timezone: "Asia/Taipei" as const, environment,
    rows: joinRecentInquiryAttributions(inquiries, attributions, (propertyData || []) as InquiryPropertyRow[]),
    meta: { generatedAt: new Date().toISOString(), limit: RECENT_INQUIRY_LIMIT }
  };
}
