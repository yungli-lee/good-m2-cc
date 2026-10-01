import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listAdminPropertyCollections } from "@/lib/property-collections/queries";
import { collectionStatusLabels, propertyCollectionFilters, propertyCollectionHref } from "@/lib/property-collections/core";
import { collectionLabel } from "@/lib/properties/collection-link";
import { formatTaipeiDateTime } from "@/lib/format";
export const runtime = "edge";
export default async function AdminPropertyCollections() {
  await requireRole(["editor", "admin", "owner"]);
  const { data, error } = await listAdminPropertyCollections();
  return <main className="section"><div className="container">
    <div className="admin-page-header"><div><h1>物件分享主題</h1><p className="muted">設定每批物件的專屬封面與固定分享連結，物件依搜尋條件持續更新。</p></div><div className="actions"><Link className="button ghost" href="/admin">返回後台</Link><Link className="button" href="/admin/property-collections/new">新增分享主題</Link></div></div>
    {error ? <div className="notice">主題讀取失敗，請稍後再試。</div> : null}
    <div className="table-wrap"><table><thead><tr><th>主題</th><th>條件</th><th>狀態</th><th>更新時間</th><th>操作</th></tr></thead><tbody>{data.map(collection => <tr key={collection.id}><td><strong>{collection.title}</strong><br /><span className="muted">{propertyCollectionHref(collection.slug)}</span></td><td>{collectionLabel(propertyCollectionFilters(collection))}</td><td>{collectionStatusLabels[collection.status]}</td><td>{formatTaipeiDateTime(collection.updated_at)}</td><td><div className="actions"><Link className="button ghost" href={`/admin/property-collections/${collection.id}/edit`}>編輯／分享</Link><Link className="button ghost" href={`/admin/property-collections/${collection.id}/preview`} target="_blank">預覽</Link></div></td></tr>)}{!error && !data.length ? <tr><td colSpan={5}>尚未建立分享主題。可先建立「鹿港農地精選」或「2000萬內住宅」。</td></tr> : null}</tbody></table></div>
  </div></main>;
}
