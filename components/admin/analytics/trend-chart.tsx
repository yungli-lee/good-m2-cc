"use client";

import { useState } from "react";
import type { AnalyticsTrend } from "@/lib/analytics-dashboard/contracts";

type Props = { trend?: AnalyticsTrend; error?: boolean };
type SeriesKey = "visitors" | "propertyViews" | "inquiries";

const seriesConfig: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: "visitors", label: "訪客", color: "#102343" },
  { key: "propertyViews", label: "物件瀏覽", color: "#c17d11" },
  { key: "inquiries", label: "詢問", color: "#b42318" }
];

export function TrendChart({ trend, error = false }: Props) {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, (trend?.series.length || 1) - 1));
  if (error || !trend) return <section className="analytics-trend-panel"><h2>轉換趨勢</h2><div className="notice" role="status">趨勢目前無法載入，經營摘要仍可正常使用。</div></section>;
  const hasData = trend.series.some((point) => point.visitors || point.propertyViews || point.inquiries);
  if (!hasData) return <section className="analytics-trend-panel"><h2>轉換趨勢</h2><div className="notice analytics-empty"><strong>這個期間還沒有趨勢資料。</strong><br />事件開始累積後會自動顯示，不使用假資料。</div></section>;

  const width = 720;
  const height = 280;
  const padding = { top: 24, right: 20, bottom: 42, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(1, ...trend.series.flatMap((point) => [point.visitors, point.propertyViews, point.inquiries]));
  const x = (index: number) => trend.series.length === 1 ? padding.left + plotWidth / 2 : padding.left + index * plotWidth / (trend.series.length - 1);
  const y = (value: number) => padding.top + plotHeight - value / maximum * plotHeight;
  const active = trend.series[Math.min(activeIndex, trend.series.length - 1)];
  const pathFor = (key: SeriesKey) => trend.series.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(2)},${y(point[key]).toFixed(2)}`).join(" ");

  return (
    <section className="analytics-trend-panel" aria-labelledby="analytics-trend-title">
      <div className="analytics-trend-heading">
        <div><h2 id="analytics-trend-title">轉換趨勢</h2><p className="muted">{trend.granularity === "hour" ? "台北時間每小時" : "台北時間每日"}，缺少的時段補 0。</p></div>
        {trend.meta.lowData ? <span className="analytics-low-data">低資料量</span> : null}
      </div>
      <ul className="analytics-trend-legend" aria-label="趨勢圖例">
        {seriesConfig.map((item) => <li key={item.key}><span style={{ background: item.color }} />{item.label}</li>)}
      </ul>
      <div className="analytics-trend-tooltip" role="status" aria-live="polite">
        <strong>{active.bucket}</strong><span>訪客 {active.visitors}</span><span>物件瀏覽 {active.propertyViews}</span><span>詢問 {active.inquiries}</span>
      </div>
      <svg className="analytics-trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="訪客、物件瀏覽與詢問趨勢折線圖">
        {[0, 0.5, 1].map((ratio) => <line key={ratio} x1={padding.left} x2={width - padding.right} y1={padding.top + plotHeight * ratio} y2={padding.top + plotHeight * ratio} className="analytics-grid-line" />)}
        {seriesConfig.map((item) => <path key={item.key} d={pathFor(item.key)} fill="none" stroke={item.color} strokeWidth="3" strokeLinejoin="round" />)}
        {trend.series.map((point, index) => (
          <g key={point.bucketStart} onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onClick={() => setActiveIndex(index)} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setActiveIndex(index);
            }
          }} tabIndex={0} role="button" aria-label={`${point.bucket}：訪客 ${point.visitors}，物件瀏覽 ${point.propertyViews}，詢問 ${point.inquiries}`}>
            <circle cx={x(index)} cy={y(point.visitors)} r="5" fill="#102343" />
            <circle cx={x(index)} cy={y(point.propertyViews)} r="5" fill="#c17d11" />
            <circle cx={x(index)} cy={y(point.inquiries)} r="5" fill="#b42318" />
            <rect x={x(index) - Math.max(7, plotWidth / Math.max(2, trend.series.length) / 2)} y={padding.top} width={Math.max(14, plotWidth / Math.max(2, trend.series.length))} height={plotHeight} fill="transparent" />
          </g>
        ))}
        <text x={padding.left} y={height - 12}>{trend.series[0]?.bucket}</text>
        <text x={width - padding.right} y={height - 12} textAnchor="end">{trend.series.at(-1)?.bucket}</text>
      </svg>
      <details className="analytics-trend-table"><summary>查看完整趨勢資料</summary><div className="table-wrap"><table><thead><tr><th>時段</th><th>訪客</th><th>物件瀏覽</th><th>詢問</th></tr></thead><tbody>{trend.series.map((point) => <tr key={point.bucketStart}><td>{point.bucket}</td><td>{point.visitors}</td><td>{point.propertyViews}</td><td>{point.inquiries}</td></tr>)}</tbody></table></div></details>
    </section>
  );
}
