import type { AnalyticsRangePreset, DashboardEnvironment } from "./contracts.ts";
import { getAnalyticsProperties } from "./properties.ts";
import { classifyLowConversionInsights } from "./insights.ts";

export async function getAnalyticsInsights(range: AnalyticsRangePreset, environment: DashboardEnvironment, now = new Date()) {
  const properties = await getAnalyticsProperties(range, environment);
  const result = classifyLowConversionInsights(properties.rows, range, now);
  return { range, timezone: "Asia/Taipei" as const, environment, rows: result.rows, thresholds: result.thresholds, meta: { generatedAt: now.toISOString(), insufficientCohort: result.insufficientCohort } };
}
