import Link from "next/link";
import type { AnalyticsInsights, LowConversionInsight } from "@/lib/analytics-dashboard/contracts";

type Props = { insights?: AnalyticsInsights; error?: boolean };
const signalLabels = { HIGH_VIEW_LOW_INQUIRY: "高瀏覽／低詢問", HIGH_VIEW_LOW_CTA: "高瀏覽／低互動", HIGH_CTA_NO_INQUIRY: "已有聯絡意圖" } as const;
const rate = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`;

function InsightCard({ insight }: { insight: LowConversionInsight }) {
  const row = insight.property;
  return <article className={`analytics-insight-card analytics-insight-${insight.severity}`}>
    <div className="analytics-insight-card-heading"><div><span className="analytics-insight-badge">{signalLabels[insight.signal]}</span><h3>{row.title || "已下架／未知物件"}</h3><small>ID: {row.propertyId}</small></div><span className="analytics-insight-severity">{insight.severity === "high" ? "High" : "Medium"}</span></div>
    <dl><div><dt>瀏覽</dt><dd>{row.views}</dd></div><div><dt>訪客</dt><dd>{row.visitors}</dd></div><div><dt>LINE</dt><dd>{row.lineClicks}</dd></div><div><dt>電話</dt><dd>{row.phoneClicks}</dd></div><div><dt>詢問</dt><dd>{row.inquiries}</dd></div><div><dt>轉換</dt><dd>{rate(row.viewInquiryConversionRate)}</dd></div><div><dt>CTA</dt><dd>{rate(row.ctaRate)}</dd></div></dl>
    <p>{insight.reason}</p>
    <p className="analytics-insight-thresholds">判定門檻：至少 {insight.minimumViews} 次瀏覽；同期間 p75 瀏覽 {insight.viewPercentileThreshold}、p25 轉換 {insight.conversionPercentileThreshold.toFixed(1)}%。</p>
    <div className="analytics-insight-actions">{row.slug ? <Link href={`/properties/${row.slug}`}>查看物件</Link> : null}<Link href="#analytics-property-title">查看完整成效</Link></div>
  </article>;
}

export function PropertyInsights({ insights, error = false }: Props) {
  if (error || !insights) return <section className="analytics-insight-panel"><h2>需要關注的物件</h2><div className="notice" role="status">物件洞察目前無法載入，其他分析仍可正常使用。</div></section>;
  return <section className="analytics-insight-panel" aria-labelledby="analytics-insight-title">
    <div className="analytics-insight-heading"><div><h2 id="analytics-insight-title">需要關注的物件</h2><p className="muted">依發布天數、樣本門檻與同期間 percentile 產生；僅表示值得檢查，不代表因果。</p></div></div>
    {!insights.rows.length ? <div className="notice analytics-empty"><strong>目前沒有需要特別關注的物件。</strong>{insights.meta.insufficientCohort ? <><br />資料量不足，暫不判定。</> : null}</div> : <div className="analytics-insight-grid">{insights.rows.map((insight) => <InsightCard key={insight.property.propertyId} insight={insight} />)}</div>}
  </section>;
}
