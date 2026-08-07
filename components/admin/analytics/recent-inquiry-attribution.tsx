import Link from "next/link";
import type { AnalyticsRecentInquiries, AttributionTouch, InquiryAttributionStatus } from "@/lib/analytics-dashboard/contracts";
import { formatAttributionTouch } from "@/lib/analytics-dashboard/recent-inquiry-attribution";

type Props = { inquiries?: AnalyticsRecentInquiries; error?: boolean };
const statusLabels: Record<InquiryAttributionStatus, string> = { complete: "完整", partial: "部分", missing: "無歸因資料", failed: "歸因失敗" };

function Touch({ value }: { value: AttributionTouch | null }) {
  const formatted = formatAttributionTouch(value);
  return <div className="analytics-attribution-touch"><strong>{formatted.sourceMedium}</strong><span>{formatted.campaign}</span></div>;
}

const inquiryTime = (value: string) => new Date(value).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "short" });

export function RecentInquiryAttribution({ inquiries, error = false }: Props) {
  if (error || !inquiries) return <section className="analytics-inquiry-panel"><h2>最近詢問歸因</h2><div className="notice" role="status">最近詢問目前無法載入，其他分析仍可正常使用。</div></section>;
  return <section className="analytics-inquiry-panel" aria-labelledby="analytics-inquiry-title">
    <div className="analytics-inquiry-heading"><h2 id="analytics-inquiry-title">最近詢問歸因</h2><p className="muted">使用詢問建立當下的 immutable attribution snapshot；不會從後續事件重新推算。</p></div>
    {!inquiries.rows.length ? <div className="notice analytics-empty"><strong>這個期間尚無詢問。</strong></div> : <>
      <div className="analytics-inquiry-desktop table-wrap"><table><thead><tr><th>時間</th><th>物件</th><th>狀態</th><th>First touch</th><th>Lead touch</th><th>Last non-direct</th></tr></thead><tbody>{inquiries.rows.map((row) => <tr key={row.inquiryId}>
        <td>{inquiryTime(row.inquiryAt)}</td><td className="analytics-inquiry-property">{row.propertySlug ? <Link href={`/properties/${row.propertySlug}`}>{row.propertyTitle || "已下架／未知物件"}</Link> : <strong>{row.propertyTitle || "已下架／未知物件"}</strong>}<small>{row.propertyId ? `ID: ${row.propertyId}${row.propertyStatus ? ` · ${row.propertyStatus}` : ""}` : "未指定物件"}</small></td>
        <td><span className={`analytics-attribution-status analytics-attribution-${row.attributionStatus}`}>{statusLabels[row.attributionStatus]}</span></td><td><Touch value={row.firstTouch} /></td><td><Touch value={row.leadTouch} /></td><td><Touch value={row.lastNonDirect} /></td>
      </tr>)}</tbody></table></div>
      <div className="analytics-inquiry-mobile">{inquiries.rows.map((row) => <article key={row.inquiryId}><div className="analytics-inquiry-card-heading"><div><h3>{row.propertyTitle || "已下架／未知物件"}</h3><small>{row.propertyId ? `ID: ${row.propertyId}` : "未指定物件"}</small><time>{inquiryTime(row.inquiryAt)}</time></div><span className={`analytics-attribution-status analytics-attribution-${row.attributionStatus}`}>{statusLabels[row.attributionStatus]}</span></div><dl><div><dt>首次來源</dt><dd><Touch value={row.firstTouch} /></dd></div><div><dt>詢問來源</dt><dd><Touch value={row.leadTouch} /></dd></div><div><dt>最後非直接來源</dt><dd><Touch value={row.lastNonDirect} /></dd></div></dl>{row.propertySlug ? <Link href={`/properties/${row.propertySlug}`}>查看物件</Link> : null}</article>)}</div>
    </>}
  </section>;
}
