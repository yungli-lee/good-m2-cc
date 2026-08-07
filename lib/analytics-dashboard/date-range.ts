import { analyticsRangePresets, type AnalyticsPeriod, type AnalyticsRangePreset } from "./contracts.ts";

export const ANALYTICS_TIMEZONE = "Asia/Taipei" as const;
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseAnalyticsRange(value: string | null | undefined): AnalyticsRangePreset {
  return analyticsRangePresets.includes(value as AnalyticsRangePreset) ? value as AnalyticsRangePreset : "30d";
}

function taipeiDayStartUtc(now: Date) {
  const taipei = new Date(now.getTime() + TAIPEI_OFFSET_MS);
  return Date.UTC(taipei.getUTCFullYear(), taipei.getUTCMonth(), taipei.getUTCDate()) - TAIPEI_OFFSET_MS;
}

export function getAnalyticsPeriod(range: AnalyticsRangePreset, now = new Date()): AnalyticsPeriod {
  const days = range === "today" ? 1 : Number.parseInt(range, 10);
  const endMs = taipeiDayStartUtc(now) + DAY_MS;
  const startMs = endMs - days * DAY_MS;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    previousStart: new Date(startMs - days * DAY_MS).toISOString(),
    previousEnd: new Date(startMs).toISOString()
  };
}
