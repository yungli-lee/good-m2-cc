import type { SummaryMetric } from "./contracts.ts";

export function combineSummaryMetrics(first: SummaryMetric, second: SummaryMetric): SummaryMetric {
  const current = first.current + second.current;
  const previous = first.previous + second.previous;
  return { current, previous, changePercent: previous === 0 ? null : (current - previous) / previous };
}
