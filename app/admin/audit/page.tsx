import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { maskAuditData } from "@/lib/audit/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    actor?: string;
    action?: string;
    resource_type?: string;
    result?: string;
    page?: string;
  }>;
};

type AuditLogRow = {
  id: string;
  created_at: string;
  user_email: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  target_email: string | null;
  result: string;
  reason: string | null;
  device: string | null;
  ip_hash: string | null;
  before_data: unknown;
  after_data: unknown;
  metadata: unknown;
};

const pageSize = 50;
const resultOptions = ["success", "denied", "failed"];
const actionOptions = [
  "admin_login_failure",
  "admin_logout",
  "login_success",
  "login_denied",
  "user_created",
  "user.role_change",
  "role_changed",
  "user_disabled",
  "user_restored",
  "display_name_updated",
  "failed_permission_attempt",
  "property_create",
  "property_update",
  "property_delete",
  "property_publish",
  "property_unpublish",
  "property_featured_change",
  "property_image_upload",
  "property_image_delete",
  "property_cover_set",
  "inquiry_status_update",
  "inquiry_note_create",
  "inquiry_mark_spam"
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei"
  }).format(new Date(value));
}

function pageHref(filters: Awaited<Props["searchParams"]>, page: number) {
  const params = new URLSearchParams();
  Object.entries({ ...filters, page: String(page) }).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `/admin/audit?${params.toString()}`;
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <strong>{label}</strong>
      <pre className="audit-json">{JSON.stringify(maskAuditData(value) || {}, null, 2)}</pre>
    </div>
  );
}

export default async function AdminAuditPage({ searchParams }: Props) {
  await requireRole(["owner"]);
  const filters = await searchParams;
  const currentPage = Math.max(1, Number(filters.page || "1") || 1);
  const from = filters.from?.trim();
  const to = filters.to?.trim();
  const actor = filters.actor?.trim();
  const action = filters.action?.trim();
  const resourceType = filters.resource_type?.trim();
  const result = filters.result?.trim();

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("audit_logs")
    .select("id,created_at,user_email,actor_role,action,resource_type,resource_id,target_email,result,reason,device,ip_hash,before_data,after_data,metadata", { count: "exact" })
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", `${from}T00:00:00+08:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59+08:00`);
  if (actor) query = query.ilike("user_email", `%${actor}%`);
  if (action) query = query.eq("action", action);
  if (resourceType) query = query.eq("resource_type", resourceType);
  if (result && resultOptions.includes(result)) query = query.eq("result", result);

  const fromRow = (currentPage - 1) * pageSize;
  const toRow = fromRow + pageSize - 1;
  const { data, error, count } = await query.range(fromRow, toRow);
  const logs = (data || []) as AuditLogRow[];
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>稽核紀錄</h1>
            <p className="muted">Read-only Audit Center。紀錄只供查詢，不提供修改或刪除。</p>
          </div>
          <Link className="button ghost" href="/admin">返回後台</Link>
        </div>

        <form className="audit-filters" action="/admin/audit">
          <label className="field">
            <span>Date from</span>
            <input className="input" name="from" type="date" defaultValue={from || ""} />
          </label>
          <label className="field">
            <span>Date to</span>
            <input className="input" name="to" type="date" defaultValue={to || ""} />
          </label>
          <label className="field">
            <span>Actor email</span>
            <input className="input" name="actor" type="search" defaultValue={actor || ""} placeholder="owner@example.com" />
          </label>
          <label className="field">
            <span>Action</span>
            <select className="select" name="action" defaultValue={action || ""}>
              <option value="">全部</option>
              {actionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Resource type</span>
            <input className="input" name="resource_type" defaultValue={resourceType || ""} placeholder="profile" />
          </label>
          <label className="field">
            <span>Result</span>
            <select className="select" name="result" defaultValue={result || ""}>
              <option value="">全部</option>
              {resultOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="actions">
            <button className="button" type="submit">篩選</button>
            <Link className="button ghost" href="/admin/audit">清除</Link>
          </div>
        </form>

        {error ? <div className="notice">稽核紀錄讀取失敗。</div> : null}

        <div className="table-wrap audit-table">
          <table>
            <thead>
              <tr>
                <th>時間</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Target</th>
                <th>Result</th>
                <th>Reason</th>
                <th>Device / IP hash</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>
                    <strong>{log.user_email || "-"}</strong>
                    <div className="muted">{log.actor_role || "-"}</div>
                  </td>
                  <td>{log.action}</td>
                  <td>
                    <strong>{log.resource_type}</strong>
                    <div className="muted">{log.resource_id || "-"}</div>
                  </td>
                  <td>{log.target_email || "-"}</td>
                  <td><span className={`audit-result is-${log.result}`}>{log.result}</span></td>
                  <td>{log.reason || "-"}</td>
                  <td>
                    <div>{log.device || "-"}</div>
                    <div className="muted audit-ip">{log.ip_hash || "-"}</div>
                  </td>
                </tr>
              ))}
              {!logs.length ? (
                <tr>
                  <td colSpan={8}>
                    <div className="admin-users-empty">
                      <strong>沒有符合條件的稽核紀錄</strong>
                      <p className="muted">請調整篩選條件後再查詢。</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="audit-details">
          {logs.map((log) => (
            <details className="card" key={`${log.id}-details`}>
              <summary>{formatDateTime(log.created_at)} / {log.action} / {log.resource_type}</summary>
              <div className="card-body audit-detail-grid">
                <JsonBlock label="Before" value={log.before_data} />
                <JsonBlock label="After" value={log.after_data} />
                <JsonBlock label="Metadata" value={log.metadata} />
              </div>
            </details>
          ))}
        </div>

        <div className="admin-users-pagination" aria-label="稽核紀錄分頁">
          <Link className="button ghost" aria-disabled={currentPage <= 1} href={pageHref(filters, Math.max(1, currentPage - 1))}>
            上一頁
          </Link>
          <span>第 {currentPage} / {totalPages} 頁，共 {total} 筆</span>
          <Link className="button ghost" aria-disabled={currentPage >= totalPages} href={pageHref(filters, Math.min(totalPages, currentPage + 1))}>
            下一頁
          </Link>
        </div>
      </div>
    </main>
  );
}
