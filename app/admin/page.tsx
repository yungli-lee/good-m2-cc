import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { canManageUsers } from "@/lib/auth/permissions";
import { getPeopleSummary } from "@/lib/people/queries";
import { countTodayAutoExpiredListings } from "@/lib/properties/expire-listings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

export default async function AdminIndexPage() {
  const current = await requireRole(["editor", "admin", "owner"]);
  const email = current.profile.email || current.user.email || "-";
  const role = current.profile.role;
  const supabase = await createSupabaseServerClient();
  const [autoExpiredCount, peopleSummary, listings, contacts] = await Promise.all([
    countTodayAutoExpiredListings(),
    getPeopleSummary(supabase),
    supabase.from("properties").select("id,title,status,updated_at")
      .eq("status", "published").is("deleted_at", null)
      .order("updated_at", { ascending: false }).limit(6),
    supabase.from("people").select("id,display_name,source,last_contacted_at,created_at")
      .eq("status", "active").is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(6)
  ]);

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>勇美銷售工作台</h1>
            <p className="muted">委託物件 × 買方需求，雙軌推進。第一版提供現有資料摘要與快速入口；跟進任務與帶看確認流程將在下一階段加入。</p>
          </div>
        </div>

        <div className="people-summary-grid" style={{ marginBottom: 18 }}>
          <article className="card"><div className="card-body">
            <p className="muted">進行中的客戶主檔</p>
            <strong style={{ fontSize: "1.8rem" }}>{peopleSummary.active.toLocaleString("zh-TW")}</strong>
            <p><Link href="/admin/people">檢視客戶 →</Link></p>
          </div></article>
          <article className="card"><div className="card-body">
            <p className="muted">本週新增客戶</p>
            <strong style={{ fontSize: "1.8rem" }}>{peopleSummary.week.toLocaleString("zh-TW")}</strong>
            <p><Link href="/admin/people?sort=newest">檢視新客戶 →</Link></p>
          </div></article>
          <article className="card"><div className="card-body">
            <p className="muted">物件委託期限提醒</p>
            <strong style={{ fontSize: "1.8rem" }}>{autoExpiredCount.toLocaleString("zh-TW")}</strong>
            <p className="muted">今日自動下架數（不代表待追蹤任務）</p>
          </div></article>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-body">
            <h2 style={{ marginTop: 0 }}>今日銷售行動</h2>
            <p className="muted">先從現有 CRM 與物件紀錄推進。待辦截止日、帶看是否確認與屋主回報尚未完成結構化統計，不會用猜測數字冒充實際進度。</p>
            <div className="actions">
              <Link className="button" href="/admin/sales-tasks">銷售跟進任務</Link>
              <Link className="button" href="/admin/people">跟進買方</Link>
              <Link className="button" href="/admin/crm/requirements">媒合客需</Link>
              <Link className="button" href="/admin/properties">推進委託物件</Link>
              <Link className="button secondary" href="/admin/inquiries">處理詢問單</Link>
            </div>
          </div>
        </div>

        <div className="people-summary-grid" style={{ marginBottom: 18 }}>
          <article className="card">
            <div className="card-body">
              <h2 style={{ marginTop: 0 }}>最近建立的客戶</h2>
              {contacts.error ? <p className="notice">客戶摘要讀取失敗，請從 People CRM 查看。</p> : null}
              {!contacts.error && !contacts.data?.length ? <p className="muted">目前沒有可顯示的客戶。</p> : null}
              {contacts.data?.map((person) => (
                <p key={person.id}>
                  <Link href={`/admin/people/${person.id}`}>{person.display_name}</Link>
                  <span className="muted"> · {person.source || "來源未設定"}</span>
                </p>
              ))}
              <Link href="/admin/people">全部客戶 →</Link>
            </div>
          </article>
          <article className="card">
            <div className="card-body">
              <h2 style={{ marginTop: 0 }}>最近更新的在售物件</h2>
              {listings.error ? <p className="notice">物件摘要讀取失敗，請從物件管理查看。</p> : null}
              {!listings.error && !listings.data?.length ? <p className="muted">目前沒有在售物件。</p> : null}
              {listings.data?.map((property) => (
                <p key={property.id}><Link href={`/admin/properties/${property.id}/edit`}>{property.title}</Link></p>
              ))}
              <Link href="/admin/properties?lifecycle=published">全部在售物件 →</Link>
            </div>
          </article>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-body">
            <h2 style={{ marginTop: 0 }}>管理與設定</h2>
            <p className="muted">登入：{email}（{role}）</p>
            <div className="actions">
              <Link className="button secondary" href="/admin/knowledge">知識管理</Link>
              <Link className="button secondary" href="/admin/social-posts">社群發文管理</Link>
              <Link className="button secondary" href="/admin/property-collections">物件分享主題</Link>
              <Link className="button secondary" href="/admin/home-campaigns">首頁 Campaign</Link>
              <Link className="button secondary" href="/admin/site-pages">靜態頁面</Link>
              <Link className="button secondary" href="/admin/navigation">導覽選單</Link>
              <Link className="button ghost" href="/admin/tools">成交試算中心</Link>
              <Link className="button ghost" href="/admin/settings/company">公司資料設定</Link>
              <Link className="button ghost" href="/admin/settings/display">前台顯示設定</Link>
              <Link className="button ghost" href="/admin/settings/ai-assistants">AI 助手形象管理</Link>
              {role === "admin" || role === "owner" ? <Link className="button ghost" href="/admin/tools/expire-listings">檢查委託到期物件</Link> : null}
              {role === "admin" || role === "owner" ? <Link className="button ghost" href="/admin/system/email">Email 診斷</Link> : null}
              {canManageUsers(role) ? <Link className="button ghost" href="/admin/users">使用者管理</Link> : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
