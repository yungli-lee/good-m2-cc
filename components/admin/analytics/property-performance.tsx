"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AnalyticsProperties, PropertyPerformanceRow } from "@/lib/analytics-dashboard/contracts";
import { sortPropertyRows, type PropertySortKey } from "@/lib/analytics-dashboard/property-aggregation";

type Props = { properties?: AnalyticsProperties; error?: boolean };
const sortOptions: Array<{ key: PropertySortKey; label: string }> = [
  { key: "views", label: "瀏覽" }, { key: "visitors", label: "訪客" }, { key: "lineClicks", label: "LINE" },
  { key: "phoneClicks", label: "電話" }, { key: "inquiries", label: "詢問" },
  { key: "viewInquiryConversionRate", label: "轉換率" }, { key: "ctaRate", label: "CTA Rate" }
];
const rate = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`;

function PropertyName({ row }: { row: PropertyPerformanceRow }) {
  const name = row.title || "已下架／未知物件";
  return <div className="analytics-property-name">{row.slug ? <Link href={`/properties/${row.slug}`}>{name}</Link> : <strong>{name}</strong>}<small>ID: {row.propertyId}{row.status ? ` · ${row.status}` : ""}</small></div>;
}

export function PropertyPerformance({ properties, error = false }: Props) {
  const [sortKey, setSortKey] = useState<PropertySortKey>("views");
  const rows = useMemo(() => sortPropertyRows(properties?.rows || [], sortKey), [properties?.rows, sortKey]);
  if (error || !properties) return <section className="analytics-property-panel"><h2>物件成效</h2><div className="notice" role="status">物件成效目前無法載入，其他分析仍可正常使用。</div></section>;
  if (!rows.length) return <section className="analytics-property-panel"><h2>物件成效</h2><div className="notice analytics-empty"><strong>這個期間尚無物件瀏覽資料。</strong></div></section>;
  const viewLeader = sortPropertyRows(rows, "views")[0];
  const inquiryLeader = sortPropertyRows(rows, "inquiries")[0];
  const summaries = [viewLeader.views ? `瀏覽最多：${viewLeader.title || "已下架／未知物件"}` : null, inquiryLeader.inquiries ? `詢問最多：${inquiryLeader.title || "已下架／未知物件"}` : null].filter(Boolean);
  const rateSort = sortKey === "viewInquiryConversionRate" || sortKey === "ctaRate";
  return <section className="analytics-property-panel" aria-labelledby="analytics-property-title">
    <div className="analytics-property-heading"><div><h2 id="analytics-property-title">物件成效</h2><p className="muted">依物件彙整瀏覽、互動與詢問；訪客及工作階段採不重複計數。</p></div></div>
    {summaries.length ? <p className="analytics-property-insight">{summaries.join("；")}。</p> : null}
    <div className="analytics-property-sort"><span>排序：</span>{sortOptions.map((option) => <button key={option.key} type="button" aria-pressed={sortKey === option.key} onClick={() => setSortKey(option.key)}>{option.label}</button>)}</div>
    {rateSort ? <p className="analytics-property-warning">比率排序會優先顯示至少 5 次瀏覽的物件，避免小樣本 100% 誤導。</p> : null}
    <div className="analytics-property-desktop table-wrap"><table><thead><tr><th>物件</th><th>瀏覽</th><th>訪客</th><th>LINE</th><th>電話</th><th>詢問</th><th>轉換率</th><th>CTA Rate</th><th>其他數據</th></tr></thead><tbody>{rows.map((row) => <tr key={row.propertyId}><td><PropertyName row={row} /></td><td>{row.views}</td><td>{row.visitors}</td><td>{row.lineClicks}</td><td>{row.phoneClicks}</td><td>{row.inquiries}</td><td>{rate(row.viewInquiryConversionRate)}</td><td>{rate(row.ctaRate)}</td><td><details><summary>展開</summary><span>Sessions {row.sessions} · 媒體 {row.mediaViews} · 分享 {row.shares} · 地圖 {row.mapOpens} · 開始詢問 {row.inquiryStarts}</span></details></td></tr>)}</tbody></table></div>
    <div className="analytics-property-mobile">{rows.map((row) => <article key={row.propertyId}><PropertyName row={row} /><dl><div><dt>瀏覽</dt><dd>{row.views}</dd></div><div><dt>訪客</dt><dd>{row.visitors}</dd></div><div><dt>LINE</dt><dd>{row.lineClicks}</dd></div><div><dt>電話</dt><dd>{row.phoneClicks}</dd></div><div><dt>詢問</dt><dd>{row.inquiries}</dd></div><div><dt>轉換</dt><dd>{rate(row.viewInquiryConversionRate)}</dd></div><div><dt>CTA</dt><dd>{rate(row.ctaRate)}</dd></div></dl><details><summary>其他數據</summary><p>Sessions {row.sessions} · 媒體 {row.mediaViews} · 分享 {row.shares} · 地圖 {row.mapOpens} · 開始詢問 {row.inquiryStarts}</p></details></article>)}</div>
  </section>;
}
