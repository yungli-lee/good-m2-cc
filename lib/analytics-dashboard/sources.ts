import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AnalyticsRangePreset, DashboardEnvironment } from "./contracts.ts";
import { getAnalyticsPeriod } from "./date-range.ts";
import { aggregateSourceRows, type SourceEventRow } from "./source-aggregation.ts";

const PAGE_SIZE = 1000;
const MAX_SOURCE_ROWS = 50_000;

async function readSourceEvents(range: AnalyticsRangePreset, environment: DashboardEnvironment) {
  const supabase = createSupabaseAdminClient();
  const period = getAnalyticsPeriod(range);
  const rows: SourceEventRow[] = [];
  let offset = 0;

  while (offset <= MAX_SOURCE_ROWS) {
    const pageEnd = offset === MAX_SOURCE_ROWS ? offset : offset + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("analytics_events")
      .select("id,event_name,visitor_id,session_id,occurred_at,utm_source,utm_medium,utm_campaign,referrer")
      .eq("environment", environment)
      .eq("is_bot", false)
      .eq("is_internal", false)
      .gte("occurred_at", period.start)
      .lt("occurred_at", period.end)
      .order("occurred_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, pageEnd);
    if (error) throw new Error(`analytics_sources_failed:${error.code || "unknown"}`);
    if (offset === MAX_SOURCE_ROWS) {
      if (!data?.length) return rows;
      throw new Error("analytics_range_too_large");
    }
    for (const row of data || []) {
      if (typeof row.event_name !== "string") continue;
      rows.push({
        event_name: row.event_name,
        visitor_id: typeof row.visitor_id === "string" ? row.visitor_id : null,
        session_id: typeof row.session_id === "string" ? row.session_id : null,
        utm_source: typeof row.utm_source === "string" ? row.utm_source : null,
        utm_medium: typeof row.utm_medium === "string" ? row.utm_medium : null,
        utm_campaign: typeof row.utm_campaign === "string" ? row.utm_campaign : null,
        referrer: typeof row.referrer === "string" ? row.referrer : null
      });
    }
    if (!data || data.length < PAGE_SIZE) return rows;
    offset += PAGE_SIZE;
  }
  return rows;
}

export async function getAnalyticsSources(range: AnalyticsRangePreset, environment: DashboardEnvironment) {
  const events = await readSourceEvents(range, environment);
  const rows = aggregateSourceRows(events);
  return {
    range,
    timezone: "Asia/Taipei" as const,
    environment,
    rows,
    meta: {
      generatedAt: new Date().toISOString(),
      lowData: new Set(events.flatMap((event) => event.visitor_id ? [event.visitor_id] : [])).size < 20,
      attributionModel: "event_source" as const
    }
  };
}
