import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { parseAnalyticsRange } from "@/lib/analytics-dashboard/date-range";
import { getDashboardEnvironment } from "@/lib/analytics-dashboard/environment";
import { getAnalyticsSummary } from "@/lib/analytics-dashboard/summary";
import { SummaryOverview } from "@/components/admin/analytics/summary-overview";
import { TrendChart } from "@/components/admin/analytics/trend-chart";
import { getAnalyticsTrend } from "@/lib/analytics-dashboard/trend";
import { getAnalyticsSources } from "@/lib/analytics-dashboard/sources";
import { SourcePerformance } from "@/components/admin/analytics/source-performance";
import { getAnalyticsProperties } from "@/lib/analytics-dashboard/properties";
import { PropertyPerformance } from "@/components/admin/analytics/property-performance";
import { classifyLowConversionInsights } from "@/lib/analytics-dashboard/insights";
import { PropertyInsights } from "@/components/admin/analytics/property-insights";
import { getAnalyticsRecentInquiries } from "@/lib/analytics-dashboard/recent-inquiries";
import { RecentInquiryAttribution } from "@/components/admin/analytics/recent-inquiry-attribution";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const rangeLabels = { today: "今天", "7d": "7 天", "30d": "30 天", "90d": "90 天" } as const;

export default async function AnalyticsDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireRole(["admin", "owner"]);
  const range = parseAnalyticsRange((await searchParams).range);

  const environment = getDashboardEnvironment();
  const [summaryResult, trendResult, sourcesResult, propertiesResult, inquiriesResult] = await Promise.allSettled([
    getAnalyticsSummary(range, environment),
    getAnalyticsTrend(range, environment),
    getAnalyticsSources(range, environment),
    getAnalyticsProperties(range, environment),
    getAnalyticsRecentInquiries(range, environment)
  ]);
  if (summaryResult.status === "fulfilled") {
    const summary = summaryResult.value;
    const metrics = summary.metrics;
    const hasNoEvents = metrics.visitors.current === 0 && metrics.sessions.current === 0 && metrics.propertyViews.current === 0 && metrics.inquiries.current === 0;
    const insightData = propertiesResult.status === "fulfilled" ? classifyLowConversionInsights(propertiesResult.value.rows, range) : null;
    return (
      <main className="section analytics-dashboard">
        <div className="container">
          <div className="analytics-heading">
            <div>
              <p className="eyebrow">Analytics / 成效分析</p>
              <h1>從瀏覽到詢問</h1>
              <p className="muted">目前顯示網站從瀏覽到詢問的轉換表現；帶看、斡旋與成交將於後續 CRM 階段接入。</p>
            </div>
            <div className="analytics-meta">
              <span>{summary.environment === "production" ? "正式環境" : "預覽環境"}</span>
              <span>台北時間</span>
            </div>
          </div>

          <nav className="analytics-range" aria-label="分析日期範圍">
            {Object.entries(rangeLabels).map(([value, label]) => (
              <Link key={value} href={`/admin/analyze?range=${value}`} aria-current={range === value ? "page" : undefined}>{label}</Link>
            ))}
          </nav>

          {summary.meta.lowData ? <div className="notice analytics-notice">目前樣本較少，百分比變化僅供參考。</div> : null}
          {hasNoEvents ? <div className="notice analytics-empty"><strong>這個期間還沒有分析資料。</strong><br />事件開始累積後，摘要會自動顯示；畫面不會使用假資料。</div> : null}

          <SummaryOverview summary={summary} />
          <PropertyInsights insights={insightData ? { range, timezone: "Asia/Taipei", environment, rows: insightData.rows, thresholds: insightData.thresholds, meta: { generatedAt: new Date().toISOString(), insufficientCohort: insightData.insufficientCohort } } : undefined} error={propertiesResult.status === "rejected"} />
          <RecentInquiryAttribution inquiries={inquiriesResult.status === "fulfilled" ? inquiriesResult.value : undefined} error={inquiriesResult.status === "rejected"} />
          <TrendChart trend={trendResult.status === "fulfilled" ? trendResult.value : undefined} error={trendResult.status === "rejected"} />
          <PropertyPerformance properties={propertiesResult.status === "fulfilled" ? propertiesResult.value : undefined} error={propertiesResult.status === "rejected"} />
          <SourcePerformance sources={sourcesResult.status === "fulfilled" ? sourcesResult.value : undefined} error={sourcesResult.status === "rejected"} />
          <p className="analytics-updated">資料更新時間：{new Date(summary.meta.generatedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</p>
        </div>
      </main>
    );
  } else {
    return (
      <main className="section analytics-dashboard">
        <div className="container">
          <h1>Analytics / 成效分析</h1>
          <div className="notice" role="alert">摘要目前無法載入，請稍後再試。既有資料不受影響。</div>
          <Link className="button" href={`/admin/analyze?range=${range}`}>重新載入</Link>
        </div>
      </main>
    );
  }
}
