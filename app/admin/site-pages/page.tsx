import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { cmsStatusLabels, sitePageLabel } from "@/lib/home-cms/types";
import { listAdminSitePages } from "@/lib/home-cms/queries";
import { formatTaipeiDateTime } from "@/lib/format";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function AdminSitePagesPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireRole(["editor", "admin", "owner"]);
  const { data: pages, error } = await listAdminSitePages();

  return (
    <main className="section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <p className="eyebrow">Home CMS</p>
            <h1>靜態頁面內容</h1>
            <p className="muted">管理服務理念、服務項目、買屋流程、阿勇生活小提醒、聯絡我們與自訂公開頁面。</p>
          </div>
          <div className="admin-actions">
            <Link className="button ghost" href="/admin">返回後台</Link>
            <Link className="button" href="/admin/site-pages/new">新增頁面內容</Link>
          </div>
        </div>
        {params.saved ? <div className="success">頁面內容已儲存。</div> : null}
        {params.error ? <div className="notice">操作失敗：{params.error}</div> : null}
        {error ? <div className="notice">頁面內容讀取失敗。</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>分類</th>
                <th>Slug</th>
                <th>標題</th>
                <th>狀態</th>
                <th>排序</th>
                <th>更新時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>{sitePageLabel(page.page_key, page.page_type)}</td>
                  <td><code>{page.page_key}</code></td>
                  <td><strong>{page.title}</strong><br /><span className="muted">{page.subtitle || "-"}</span></td>
                  <td>{cmsStatusLabels[page.status]}</td>
                  <td>{page.sort_order}</td>
                  <td>{formatTaipeiDateTime(page.updated_at)}</td>
                  <td><Link className="button ghost" href={`/admin/site-pages/${page.id}/edit`}>編輯</Link></td>
                </tr>
              ))}
              {!pages.length ? (
                <tr><td colSpan={7}><div className="admin-users-empty">尚未建立頁面內容；前台會使用既有 fallback。</div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
