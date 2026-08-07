import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AnalyticsPeriod, AnalyticsRangePreset, DashboardEnvironment } from "./contracts.ts";
import { getAnalyticsPeriod } from "./date-range.ts";
import { comparison, rateComparison } from "./metrics.ts";

const ID_PAGE_SIZE = 1000;
const MAX_ID_ROWS = 50_000;

type EventName = "view_property" | "click_line" | "click_phone" | "inquiry_created";
type PeriodSnapshot = {
  visitors: number;
  sessions: number;
  propertyViews: number;
  lineClicks: number;
  phoneClicks: number;
  inquiries: number;
  inquiryVisitors: number;
};

async function countEvents(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  environment: DashboardEnvironment,
  start: string,
  end: string,
  eventName: EventName
) {
  const { count, error } = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("environment", environment)
    .eq("is_bot", false)
    .eq("is_internal", false)
    .gte("occurred_at", start)
    .lt("occurred_at", end)
    .eq("event_name", eventName);
  if (error) throw new Error(`analytics_count_failed:${error.code || "unknown"}`);
  return count || 0;
}

async function countDistinctIds(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  environment: DashboardEnvironment,
  start: string,
  end: string,
  column: "visitor_id" | "session_id",
  eventName?: EventName
) {
  const ids = new Set<string>();
  let offset = 0;

  while (offset <= MAX_ID_ROWS) {
    const pageEnd = offset === MAX_ID_ROWS ? offset : offset + ID_PAGE_SIZE - 1;
    let pageIds: string[];
    if (column === "visitor_id") {
      let query = supabase
        .from("analytics_events")
        .select("visitor_id")
        .not("visitor_id", "is", null)
        .eq("environment", environment)
        .eq("is_bot", false)
        .eq("is_internal", false)
        .gte("occurred_at", start)
        .lt("occurred_at", end)
        .order("id", { ascending: true });
      if (eventName) query = query.eq("event_name", eventName);
      const { data, error } = await query.range(offset, pageEnd);
      if (error) throw new Error(`analytics_identity_failed:${error.code || "unknown"}`);
      pageIds = (data || []).flatMap((row) => typeof row.visitor_id === "string" ? [row.visitor_id] : []);
    } else {
      let query = supabase
        .from("analytics_events")
        .select("session_id")
        .not("session_id", "is", null)
        .eq("environment", environment)
        .eq("is_bot", false)
        .eq("is_internal", false)
        .gte("occurred_at", start)
        .lt("occurred_at", end)
        .order("id", { ascending: true });
      if (eventName) query = query.eq("event_name", eventName);
      const { data, error } = await query.range(offset, pageEnd);
      if (error) throw new Error(`analytics_identity_failed:${error.code || "unknown"}`);
      pageIds = (data || []).flatMap((row) => typeof row.session_id === "string" ? [row.session_id] : []);
    }
    if (offset === MAX_ID_ROWS) {
      if (pageIds.length === 0) return ids.size;
      throw new Error("analytics_range_too_large");
    }
    for (const id of pageIds) ids.add(id);
    if (pageIds.length < ID_PAGE_SIZE) return ids.size;
    offset += ID_PAGE_SIZE;
  }
  return ids.size;
}

async function readPeriod(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  environment: DashboardEnvironment,
  start: string,
  end: string
): Promise<PeriodSnapshot> {
  const [visitors, sessions, propertyViews, lineClicks, phoneClicks, inquiries, inquiryVisitors] = await Promise.all([
    countDistinctIds(supabase, environment, start, end, "visitor_id"),
    countDistinctIds(supabase, environment, start, end, "session_id"),
    countEvents(supabase, environment, start, end, "view_property"),
    countEvents(supabase, environment, start, end, "click_line"),
    countEvents(supabase, environment, start, end, "click_phone"),
    countEvents(supabase, environment, start, end, "inquiry_created"),
    countDistinctIds(supabase, environment, start, end, "visitor_id", "inquiry_created")
  ]);
  return { visitors, sessions, propertyViews, lineClicks, phoneClicks, inquiries, inquiryVisitors };
}

export async function getAnalyticsSummary(range: AnalyticsRangePreset, environment: DashboardEnvironment, now = new Date()) {
  const period: AnalyticsPeriod = getAnalyticsPeriod(range, now);
  const supabase = createSupabaseAdminClient();
  const [current, previous] = await Promise.all([
    readPeriod(supabase, environment, period.start, period.end),
    readPeriod(supabase, environment, period.previousStart, period.previousEnd)
  ]);

  return {
    range,
    timezone: "Asia/Taipei" as const,
    environment,
    period,
    metrics: {
      visitors: comparison(current.visitors, previous.visitors),
      sessions: comparison(current.sessions, previous.sessions),
      propertyViews: comparison(current.propertyViews, previous.propertyViews),
      lineClicks: comparison(current.lineClicks, previous.lineClicks),
      phoneClicks: comparison(current.phoneClicks, previous.phoneClicks),
      inquiries: comparison(current.inquiries, previous.inquiries),
      inquiryConversionRate: rateComparison(current.inquiryVisitors, current.visitors, previous.inquiryVisitors, previous.visitors)
    },
    meta: {
      generatedAt: now.toISOString(),
      lowData: current.visitors < 20
    }
  };
}
