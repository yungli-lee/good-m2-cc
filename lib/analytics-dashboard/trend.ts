import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AnalyticsRangePreset, DashboardEnvironment } from "./contracts.ts";
import { getAnalyticsPeriod } from "./date-range.ts";
import { buildTrendSeries, getTrendGranularity, type TrendEventRow } from "./trend-buckets.ts";

const PAGE_SIZE = 1000;
const MAX_TREND_ROWS = 50_000;

async function readTrendEvents(range: AnalyticsRangePreset, environment: DashboardEnvironment, now: Date) {
  const supabase = createSupabaseAdminClient();
  const period = getAnalyticsPeriod(range, now);
  const end = new Date(Math.min(now.getTime(), Date.parse(period.end))).toISOString();
  const rows: TrendEventRow[] = [];
  let offset = 0;

  while (offset <= MAX_TREND_ROWS) {
    const pageEnd = offset === MAX_TREND_ROWS ? offset : offset + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("analytics_events")
      .select("id,event_name,visitor_id,occurred_at")
      .eq("environment", environment)
      .eq("is_bot", false)
      .eq("is_internal", false)
      .gte("occurred_at", period.start)
      .lt("occurred_at", end)
      .order("occurred_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, pageEnd);
    if (error) throw new Error(`analytics_trend_failed:${error.code || "unknown"}`);
    if (offset === MAX_TREND_ROWS) {
      if (!data?.length) return rows;
      throw new Error("analytics_range_too_large");
    }
    for (const row of data || []) {
      if (typeof row.event_name === "string" && typeof row.occurred_at === "string") {
        rows.push({ event_name: row.event_name, visitor_id: typeof row.visitor_id === "string" ? row.visitor_id : null, occurred_at: row.occurred_at });
      }
    }
    if (!data || data.length < PAGE_SIZE) return rows;
    offset += PAGE_SIZE;
  }
  return rows;
}

export async function getAnalyticsTrend(range: AnalyticsRangePreset, environment: DashboardEnvironment, now = new Date()) {
  const rows = await readTrendEvents(range, environment, now);
  const series = buildTrendSeries(range, rows, now);
  return {
    range,
    timezone: "Asia/Taipei" as const,
    environment,
    granularity: getTrendGranularity(range),
    series,
    meta: {
      generatedAt: now.toISOString(),
      lowData: rows.length < 20
    }
  };
}
