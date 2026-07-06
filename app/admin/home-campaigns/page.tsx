import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { cmsStatusLabels } from "@/lib/home-cms/types";
import { listAdminHomeCampaigns } from "@/lib/home-cms/queries";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function AdminHomeCampaignsPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireRole(["editor", "admin", "owner"]);
  const { data: campaigns, error } = await listAdminHomeCampaigns();

  return (
    <main className="section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <p className="eyebrow">Home CMS</p>
            <h1>首頁 Campaign</h1>
            <p className="muted">管理首頁 Hero / Campaign 檔期、CTA、圖片與排序。</p>
          </div>
          <div className="admin-actions">
            <Link className="button ghost" href="/admin">返回後台</Link>
            <Link className="button" href="/admin/home-campaigns/new">新增 Campaign</Link>
          </div>
        </div>
        {params.saved ? <div className="success">Campaign 已儲存。</div> : null}
        {params.error ? <div className="notice">操作失敗：{params.error}</div> : null}
        {error ? <div className="notice">Campaign 讀取失敗。</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>標題</th>
                <th>狀態</th>
                <th>排序</th>
                <th>開始</th>
                <th>結束</th>
                <th>更新時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td><strong>{campaign.title}</strong><br /><span className="muted">{campaign.subtitle || "-"}</span></td>
                  <td>{cmsStatusLabels[campaign.status]}</td>
                  <td>{campaign.sort_order}</td>
                  <td>{formatDate(campaign.starts_at)}</td>
                  <td>{formatDate(campaign.ends_at)}</td>
                  <td>{formatDate(campaign.updated_at)}</td>
                  <td><Link className="button ghost" href={`/admin/home-campaigns/${campaign.id}/edit`}>編輯</Link></td>
                </tr>
              ))}
              {!campaigns.length ? (
                <tr><td colSpan={7}><div className="admin-users-empty">尚未建立 Campaign。</div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
