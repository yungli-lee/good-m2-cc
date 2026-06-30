import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { canManageUsers } from "@/lib/auth/permissions";

export const runtime = "edge";

export default async function AdminIndexPage() {
  const current = await requireRole(["editor", "admin", "owner"]);
  const email = current.profile.email || current.user.email || "-";
  const role = current.profile.role;

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>後台首頁</h1>
            <p className="muted">Supabase Auth session 已建立；完整 Dashboard 會在後續 Sprint 處理。</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-body">
            <h2 style={{ marginTop: 0 }}>登入狀態</h2>
            <p>Email：{email}</p>
            <p>Role：{role}</p>
          </div>
        </div>

        <div className="actions">
          <Link className="button" href="/admin/properties">物件管理</Link>
          <Link className="button secondary" href="/admin/knowledge">知識管理</Link>
          <Link className="button secondary" href="/admin/inquiries">詢問單</Link>
          <Link className="button ghost" href="/admin/tools/seller-net-profit">賣屋淨利反推成交價</Link>
          <Link className="button ghost" href="/admin/settings/company">公司資料設定</Link>
          {role === "admin" || role === "owner" ? <Link className="button ghost" href="/admin/tools/expire-listings">檢查委託到期物件</Link> : null}
          {canManageUsers(role) ? <Link className="button ghost" href="/admin/users">使用者管理</Link> : null}
        </div>
      </div>
    </main>
  );
}
