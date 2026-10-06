import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listAdminAreaPages } from "@/lib/areas-cms";
export const runtime = "edge";
export default async function AdminAreasPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole(["editor","admin","owner"]); const params = await searchParams; const { data, error } = await listAdminAreaPages();
  return <main className="section"><div className="container"><div className="admin-page-header"><div><p className="eyebrow">Area CMS</p><h1>服務地區</h1><p className="muted">新增鄉鎮、調整內容、排序及控制前台發布狀態。</p></div><div className="admin-actions"><Link className="button ghost" href="/areas" target="_blank">查看前台</Link><Link className="button" href="/admin/areas/new">新增服務地區</Link></div></div>
  {params.error || error ? <div className="notice">服務地區讀取或操作失敗。</div> : null}<div className="table-wrap"><table><thead><tr><th>地區</th><th>Slug</th><th>狀態</th><th>排序</th><th>操作</th></tr></thead><tbody>{data.map((area) => <tr key={area.id}><td><strong>{area.name}</strong><br/><span className="muted">{area.city}・{area.district}</span></td><td><code>{area.slug}</code></td><td>{area.status === "published" ? "已發布" : area.status === "archived" ? "已下架" : "草稿"}</td><td>{area.sort_order}</td><td><Link className="button ghost" href={`/admin/areas/${area.id}/edit`}>編輯</Link></td></tr>)}</tbody></table></div></div></main>;
}
