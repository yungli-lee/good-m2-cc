import type { AnalyticsRangePreset, AnalyticsTrendPoint, TrendGranularity } from "./contracts.ts";
import { getAnalyticsPeriod } from "./date-range.ts";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const TAIPEI_OFFSET_MS = 8 * HOUR_MS;

export type TrendEventRow = {
  event_name: string;
  visitor_id: string | null;
  occurred_at: string;
};

type MutableTrendPoint = AnalyticsTrendPoint & { visitorIds: Set<string> };

function taipeiParts(timestamp: number) {
  const local = new Date(timestamp + TAIPEI_OFFSET_MS);
  return {
    year: local.getUTCFullYear(),
    month: String(local.getUTCMonth() + 1).padStart(2, "0"),
    day: String(local.getUTCDate()).padStart(2, "0"),
    hour: String(local.getUTCHours()).padStart(2, "0")
  };
}

export function getTrendGranularity(range: AnalyticsRangePreset): TrendGranularity {
  return range === "today" ? "hour" : "day";
}

export function buildTrendSeries(range: AnalyticsRangePreset, rows: TrendEventRow[], now = new Date()): AnalyticsTrendPoint[] {
  const period = getAnalyticsPeriod(range, now);
  const startMs = Date.parse(period.start);
  const endMs = Math.min(now.getTime(), Date.parse(period.end));
  const granularity = getTrendGranularity(range);
  const bucketMs = granularity === "hour" ? HOUR_MS : DAY_MS;
  const bucketCount = granularity === "hour"
    ? Math.max(1, Math.floor((endMs - startMs) / HOUR_MS) + 1)
    : Number.parseInt(range, 10);
  const points: MutableTrendPoint[] = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStartMs = startMs + index * bucketMs;
    const parts = taipeiParts(bucketStartMs);
    return {
      bucket: granularity === "hour" ? `${parts.hour}:00` : `${parts.year}-${parts.month}-${parts.day}`,
      bucketStart: new Date(bucketStartMs).toISOString(),
      visitors: 0,
      propertyViews: 0,
      inquiries: 0,
      visitorIds: new Set<string>()
    };
  });

  for (const row of rows) {
    const occurredMs = Date.parse(row.occurred_at);
    if (!Number.isFinite(occurredMs) || occurredMs < startMs || occurredMs >= endMs) continue;
    const index = Math.floor((occurredMs - startMs) / bucketMs);
    const point = points[index];
    if (!point) continue;
    if (row.visitor_id) point.visitorIds.add(row.visitor_id);
    if (row.event_name === "view_property") point.propertyViews += 1;
    if (row.event_name === "inquiry_created") point.inquiries += 1;
  }

  return points.map(({ visitorIds, ...point }) => ({ ...point, visitors: visitorIds.size }));
}
