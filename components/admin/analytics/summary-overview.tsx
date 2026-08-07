import type { AnalyticsSummary } from "@/lib/analytics-dashboard/contracts";
import { combineSummaryMetrics } from "@/lib/analytics-dashboard/summary-presentation";
import { MetricCard } from "./metric-card";

export function SummaryOverview({ summary }: { summary: AnalyticsSummary }) {
  const metrics = summary.metrics;
  const contactInteractions = combineSummaryMetrics(metrics.lineClicks, metrics.phoneClicks);
  return <section className="analytics-summary" aria-label="核心摘要">
    <div className="analytics-summary-primary">
      <MetricCard label="詢問" metric={metrics.inquiries} />
      <MetricCard label="詢問轉換率" metric={metrics.inquiryConversionRate} rate />
      <MetricCard label="物件瀏覽" metric={metrics.propertyViews} />
      <MetricCard label="訪客" metric={metrics.visitors} />
      <MetricCard label="聯絡互動" metric={contactInteractions} />
    </div>
    <div className="analytics-summary-secondary" aria-label="其他摘要指標">
      <MetricCard label="LINE 點擊" metric={metrics.lineClicks} compact />
      <MetricCard label="電話點擊" metric={metrics.phoneClicks} compact />
      <MetricCard label="造訪次數" metric={metrics.sessions} compact />
    </div>
  </section>;
}
