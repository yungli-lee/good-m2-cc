import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AnalyticsRangePreset, DashboardEnvironment } from "./contracts.ts";
import { getAnalyticsPeriod } from "./date-range.ts";
import { aggregatePropertyRows, type PropertyEventRow, type PropertyMetadataRow } from "./property-aggregation.ts";

const PAGE_SIZE = 1000;
const MAX_PROPERTY_EVENT_ROWS = 50_000;

async function readPropertyEvents(range: AnalyticsRangePreset, environment: DashboardEnvironment) {
  const supabase = createSupabaseAdminClient();
  const period = getAnalyticsPeriod(range);
  const rows: PropertyEventRow[] = [];
  let offset = 0;
  while (offset <= MAX_PROPERTY_EVENT_ROWS) {
    const pageEnd = offset === MAX_PROPERTY_EVENT_ROWS ? offset : offset + PAGE_SIZE - 1;
    const { data, error } = await supabase.from("analytics_events")
      .select("id,property_id,event_name,visitor_id,session_id,occurred_at")
      .not("property_id", "is", null)
      .eq("environment", environment).eq("is_bot", false).eq("is_internal", false)
      .gte("occurred_at", period.start).lt("occurred_at", period.end)
      .order("occurred_at", { ascending: true }).order("id", { ascending: true }).range(offset, pageEnd);
    if (error) throw new Error(`analytics_properties_failed:${error.code || "unknown"}`);
    if (offset === MAX_PROPERTY_EVENT_ROWS) {
      if (!data?.length) return rows;
      throw new Error("analytics_range_too_large");
    }
    for (const row of data || []) {
      if (typeof row.property_id !== "string" || typeof row.event_name !== "string") continue;
      rows.push({ property_id: row.property_id, event_name: row.event_name, visitor_id: typeof row.visitor_id === "string" ? row.visitor_id : null, session_id: typeof row.session_id === "string" ? row.session_id : null });
    }
    if (!data || data.length < PAGE_SIZE) return rows;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function readPropertyMetadata(propertyIds: string[]) {
  if (!propertyIds.length) return [];
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("properties").select("id,title,slug,status").in("id", propertyIds);
  if (error) throw new Error(`analytics_property_metadata_failed:${error.code || "unknown"}`);
  return (data || []).filter((row): row is PropertyMetadataRow => typeof row.id === "string" && typeof row.title === "string" && typeof row.slug === "string" && typeof row.status === "string");
}

export async function getAnalyticsProperties(range: AnalyticsRangePreset, environment: DashboardEnvironment) {
  const events = await readPropertyEvents(range, environment);
  const propertyIds = [...new Set(events.map((event) => event.property_id).filter((id): id is string => Boolean(id)))];
  const metadata = await readPropertyMetadata(propertyIds);
  return { range, timezone: "Asia/Taipei" as const, environment, rows: aggregatePropertyRows(events, metadata), meta: { generatedAt: new Date().toISOString(), sampleGuardViews: 5 as const } };
}
