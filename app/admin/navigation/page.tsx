import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listAdminNavigationItems, resolveNavigationItem } from "@/lib/navigation";

export const runtime = "edge";

export default async function NavigationAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const query = await searchParams;
  await requireRole(["editor", "admin", "owner"]);
  const { data, error } = await listAdminNavigationItems();
  return (
    <main className="section"><div className="container">
      <div className="admin-page-header">
        <div><p className="eyebrow">Site Navigation</p><h1>導覽選單</h1><p className="muted">Header、Mobile 與 Footer 共用此 CMS。</p></div>
        <div className="admin-actions"><Link className="button ghost" href="/admin">返回後台</Link><Link className="button" href="/admin/navigation/new">新增選單項目</Link></div>
      </div>
      {query.saved ? <div className="success">導覽項目已儲存。</div> : null}
      {query.error || error ? <div className="notice">導覽項目讀取或操作失敗。</div> : null}
      <div className="table-wrap"><table><thead><tr><th>位置</th><th>名稱</th><th>目的地</th><th>排序</th><th>狀態</th><th>操作</th></tr></thead>
        <tbody>{data.map((item) => <tr key={item.id}>
          <td>{item.location}</td><td>{item.label}</td><td><code>{resolveNavigationItem(item)?.href || "頁面未發布"}</code></td>
          <td>{item.sort_order}</td><td>{item.is_visible ? "顯示" : "隱藏"}</td>
          <td><Link className="button ghost" href={`/admin/navigation/${item.id}/edit`}>編輯</Link></td>
        </tr>)}</tbody>
      </table></div>
    </div></main>
  );
}
