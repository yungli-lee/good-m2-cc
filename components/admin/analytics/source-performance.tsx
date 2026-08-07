"use client";

import { useMemo, useState } from "react";
import type { AnalyticsSources, SourcePerformanceRow } from "@/lib/analytics-dashboard/contracts";
import { sortSourceRows, type SourceSortKey } from "@/lib/analytics-dashboard/source-aggregation";

type Props = { sources?: AnalyticsSources; error?: boolean };
const sortOptions: Array<{ key: SourceSortKey; label: string }> = [
  { key: "inquiries", label: "詢問" },
  { key: "visitors", label: "訪客" },
  { key: "propertyViews", label: "物件瀏覽" },
  { key: "lineClicks", label: "LINE" },
  { key: "phoneClicks", label: "電話" },
  { key: "conversionRate", label: "轉換率" }
];

function rate(row: SourcePerformanceRow) {
  return row.conversionRate === null ? "—" : `${row.conversionRate.toFixed(1)}%`;
}

export function SourcePerformance({ sources, error = false }: Props) {
  const [sortKey, setSortKey] = useState<SourceSortKey>("inquiries");
  const rows = useMemo(() => sortSourceRows(sources?.rows || [], sortKey), [sources?.rows, sortKey]);
  if (error || !sources) return <section className="analytics-source-panel"><h2>來源成效</h2><div className="notice" role="status">來源成效目前無法載入，摘要與趨勢仍可正常使用。</div></section>;
  if (!rows.length) return <section className="analytics-source-panel"><h2>來源成效</h2><div className="notice analytics-empty"><strong>這個期間尚無可歸類的來源資料。</strong></div></section>;

  const visitorLeader = sortSourceRows(rows, "visitors")[0];
  const inquiryLeader = sortSourceRows(rows, "inquiries")[0];
  const insights = [
    visitorLeader.visitors > 0 ? `${visitorLeader.source} 帶來最多訪客` : null,
    inquiryLeader.inquiries > 0 ? `${inquiryLeader.source} 帶來最多詢問` : null
  ].filter(Boolean);
  return (
    <section className="analytics-source-panel" aria-labelledby="analytics-source-title">
      <div className="analytics-source-heading">
        <div><h2 id="analytics-source-title">來源成效</h2><p className="muted">依事件當下的流量來源分組，不等同詢問的 first-touch 或 lead-touch attribution。</p></div>
        {sources.meta.lowData ? <span className="analytics-low-data">低資料量</span> : null}
      </div>
      {insights.length ? <p className="analytics-source-insight">{insights.join("；")}。</p> : null}
      <div className="analytics-source-sort"><span>排序：</span>{sortOptions.map((option) => <button key={option.key} type="button" aria-pressed={sortKey === option.key} onClick={() => setSortKey(option.key)}>{option.label}</button>)}</div>
      {sortKey === "conversionRate" ? <p className="analytics-source-warning">轉換率排序會優先顯示至少 5 位訪客的來源，避免小樣本 100% 誤導。</p> : null}

      <div className="analytics-source-desktop table-wrap"><table><thead><tr><th>Source</th><th>Medium</th><th>Campaign</th><th>訪客</th><th>Sessions</th><th>物件瀏覽</th><th>LINE</th><th>電話</th><th>詢問</th><th>轉換率</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.source}\0${row.medium}\0${row.campaign}`}><td>{row.source}</td><td>{row.medium}</td><td className="analytics-campaign-cell">{row.campaign}</td><td>{row.visitors}</td><td>{row.sessions}</td><td>{row.propertyViews}</td><td>{row.lineClicks}</td><td>{row.phoneClicks}</td><td>{row.inquiries}</td><td>{rate(row)}</td></tr>)}</tbody></table></div>

      <div className="analytics-source-mobile">{rows.map((row) => <article key={`${row.source}\0${row.medium}\0${row.campaign}`}><h3>{row.source} / {row.medium}</h3><p className="analytics-source-campaign">{row.campaign}</p><dl><div><dt>訪客</dt><dd>{row.visitors}</dd></div><div><dt>瀏覽</dt><dd>{row.propertyViews}</dd></div><div><dt>LINE</dt><dd>{row.lineClicks}</dd></div><div><dt>詢問</dt><dd>{row.inquiries}</dd></div><div><dt>轉換</dt><dd>{rate(row)}</dd></div></dl><details><summary>其他數據</summary><p>Sessions {row.sessions} · 電話 {row.phoneClicks}</p></details></article>)}</div>
    </section>
  );
}
