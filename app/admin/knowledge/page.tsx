import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { canDeleteKnowledge, canEditKnowledge, canPublishKnowledge } from "@/lib/content/permissions";
import { listKnowledgeItems } from "@/lib/content/queries";
import type { KnowledgeListFilter } from "@/lib/content/queries";
import { contentStatusLabels, legalStatusLabels } from "@/lib/content/types";
import {
  archiveKnowledgeAction,
  publishKnowledgeAction,
  restoreKnowledgeAction,
  softDeleteKnowledgeAction
} from "./actions";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ q?: string; filter?: string; error?: string; saved?: string }>;
};

const filters: Array<{ value: KnowledgeListFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "published", label: "已發布" },
  { value: "archived", label: "封存" },
  { value: "review", label: "待複查" },
  { value: "deleted", label: "已刪除" }
];

const errorMessage: Record<string, string> = {
  forbidden: "目前帳號沒有此操作權限。",
  not_found: "找不到指定內容。",
  invalid_form: "請確認欄位內容。",
  create_failed: "新增失敗，請稍後再試。",
  update_failed: "儲存失敗，請稍後再試。",
  publish_failed: "發布失敗，請稍後再試。",
  archive_failed: "封存失敗，請稍後再試。",
  delete_failed: "刪除失敗，請稍後再試。",
  restore_failed: "還原失敗，請稍後再試。"
};

function filterHref(filter: KnowledgeListFilter, q: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (filter !== "all") params.set("filter", filter);
  return `/admin/knowledge${params.toString() ? `?${params.toString()}` : ""}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium" }).format(date);
}

export default async function AdminKnowledgePage({ searchParams }: Props) {
  const params = await searchParams;
  const current = await requireRole(["editor", "admin", "owner"]);
  const filter = filters.some((item) => item.value === params.filter) ? params.filter as KnowledgeListFilter : "all";
  const q = params.q?.trim() || "";
  const { data: items, error } = await listKnowledgeItems({ q, filter });
  const canPublish = canPublishKnowledge(current.profile.role);
  const canDelete = canDeleteKnowledge(current.profile.role);

  return (
    <main className="section">
      <div className="container">
        <div className="admin-page-header">
          <div>
            <p className="eyebrow">Content Platform</p>
            <h1>知識管理</h1>
            <p className="muted">第一版僅開放不動產知識內容，Blog / FAQ / AI 先保留在底層架構。</p>
          </div>
          <div className="admin-actions">
            <Link className="button ghost" href="/admin">返回後台</Link>
            <Link className="button" href="/admin/knowledge/new">新增知識</Link>
          </div>
        </div>

        {params.error ? <div className="notice">{errorMessage[params.error] || `操作失敗：${params.error}`}</div> : null}
        {params.saved ? <div className="success">操作已完成。</div> : null}
        {error ? <div className="notice">知識內容讀取失敗。</div> : null}

        <form className="searchbar" action="/admin/knowledge">
          <input className="input" name="q" defaultValue={q} placeholder="搜尋標題或 slug" />
          <button className="button ghost" type="submit">搜尋</button>
          {q ? <Link className="button ghost" href="/admin/knowledge">清除</Link> : null}
        </form>

        <div className="admin-filter-tabs" aria-label="知識狀態篩選">
          {filters.map((item) => (
            <Link key={item.value} className={filter === item.value ? "button" : "button ghost"} href={filterHref(item.value, q)}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>標題</th>
                <th>狀態</th>
                <th>分類</th>
                <th>法規狀態</th>
                <th>下次複查</th>
                <th>更新時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <br />
                    <span className="muted">/knowledge/{item.slug}</span>
                    {item.deleted_at ? <><br /><span className="notice">已刪除</span></> : null}
                  </td>
                  <td>{contentStatusLabels[item.status]}</td>
                  <td>{item.content_categories?.name || "未分類"}</td>
                  <td>{item.legal_status ? legalStatusLabels[item.legal_status] : "一般內容"}</td>
                  <td>{formatDate(item.next_review_at)}</td>
                  <td>{formatDate(item.updated_at)}</td>
                  <td>
                    <div className="admin-actions">
                      {canEditKnowledge(current.profile.role, item) ? <Link className="button ghost" href={`/admin/knowledge/${item.id}/edit`}>編輯</Link> : null}
                      {canPublish && !item.deleted_at && item.status !== "published" ? (
                        <form action={publishKnowledgeAction.bind(null, item.id)}>
                          <button className="button" type="submit">發布</button>
                        </form>
                      ) : null}
                      {canPublish && !item.deleted_at && item.status === "published" ? (
                        <form action={archiveKnowledgeAction.bind(null, item.id)}>
                          <button className="button ghost" type="submit">封存</button>
                        </form>
                      ) : null}
                      {canDelete && !item.deleted_at ? (
                        <form action={softDeleteKnowledgeAction.bind(null, item.id)}>
                          <button className="button danger" type="submit">刪除</button>
                        </form>
                      ) : null}
                      {canDelete && item.deleted_at ? (
                        <form action={restoreKnowledgeAction.bind(null, item.id)}>
                          <button className="button" type="submit">還原</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-users-empty">目前沒有符合條件的知識內容。</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

