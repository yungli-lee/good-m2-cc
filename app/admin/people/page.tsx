import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { personRoleNames, personSources, personStatuses } from "@/lib/people/constants";
import { personRoleLabels } from "@/lib/people/labels";
import {
  getPeopleSummary,
  listAdminPeople,
  listPeopleAssignees
} from "@/lib/people/queries";
import type { PeopleSort } from "@/lib/people/schema";
import type { PersonRoleName, PersonSource, PersonStatus } from "@/lib/people/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { archivePersonAction } from "./actions";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    source?: string;
    assigned_to?: string;
    sort?: string;
    error?: string;
    saved?: string;
  }>;
};

const sourceLabel: Record<string, string> = {
  manual: "手動",
  inquiry: "詢問單",
  line: "Line",
  facebook: "Facebook",
  referral: "轉介紹",
  import: "匯入",
  other: "其他"
};

const statusLabel: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived"
};

const sortOptions: Array<{ value: PeopleSort; label: string }> = [
  { value: "newest", label: "最新建立" },
  { value: "oldest", label: "最早建立" },
  { value: "last_contacted_at", label: "最近聯絡" },
  { value: "display_name", label: "顯示名稱" }
];

const errorMessage: Record<string, string> = {
  not_found: "找不到指定客戶。",
  archive_failed: "封存失敗，請稍後再試。"
};

const savedMessage: Record<string, string> = {
  archived: "客戶已封存。"
};

function isRole(value?: string): value is PersonRoleName {
  return personRoleNames.includes(value as PersonRoleName);
}

function isStatus(value?: string): value is PersonStatus {
  return personStatuses.includes(value as PersonStatus);
}

function isSource(value?: string): value is PersonSource {
  return personSources.includes(value as PersonSource);
}

function isSort(value?: string): value is PeopleSort {
  return sortOptions.some((item) => item.value === value);
}

function assigneeLabel(assignee: { id: string; email: string | null; display_name: string | null }) {
  return assignee.display_name || assignee.email || assignee.id;
}

function roleBadges(roles: PersonRoleName[]) {
  if (!roles.length) return <span className="muted">未設定</span>;
  return (
    <div className="actions">
      {roles.map((role) => (
        <span key={role} className="admin-users-badge is-active">{personRoleLabels[role]}</span>
      ))}
    </div>
  );
}

function summaryCard(label: string, value: number) {
  return (
    <article className="card">
      <div className="card-body">
        <p className="muted" style={{ marginTop: 0 }}>{label}</p>
        <strong style={{ fontSize: "1.8rem" }}>{value.toLocaleString("zh-TW")}</strong>
      </div>
    </article>
  );
}

export default async function AdminPeoplePage({ searchParams }: Props) {
  await requireRole(["editor", "admin", "owner"]);
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [summary, assigneesResult] = await Promise.all([
    getPeopleSummary(supabase),
    listPeopleAssignees(supabase)
  ]);
  const role = query.role === "all" || isRole(query.role) ? query.role : "all";
  const status = query.status === "all" || isStatus(query.status) ? query.status : "all";
  const source = query.source === "all" || isSource(query.source) ? query.source : "all";
  const sort = isSort(query.sort) ? query.sort : "newest";
  const assignedTo = query.assigned_to || "";
  const { data: people, error } = await listAdminPeople(supabase, {
    q: query.q || "",
    role,
    status,
    source,
    assigned_to: assignedTo,
    sort
  });

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>客戶 / People</h1>
            <p className="muted">People First 的 CRM 主檔，只管理人與角色，不處理需求、追蹤或媒合。</p>
          </div>
          <div className="actions">
            <Link className="button ghost" href="/admin">返回後台</Link>
            <Link className="button" href="/admin/people/new">新增客戶</Link>
          </div>
        </div>

        {query.saved ? <div className="notice">{savedMessage[query.saved] || "已儲存。"}</div> : null}
        {query.error ? <div className="notice">{errorMessage[query.error] || "操作失敗，請稍後再試。"}</div> : null}
        {error ? <div className="notice">客戶資料讀取失敗。</div> : null}

        <div className="people-summary-grid">
          {summaryCard("Active people", summary.active)}
          {summaryCard("今日新增", summary.today)}
          {summaryCard("本週新增", summary.week)}
          {summaryCard("已封存 archived", summary.archived)}
        </div>

        <form className="form-grid" style={{ marginBottom: 16 }} action="/admin/people">
          <label className="field">
            <span>搜尋</span>
            <input className="input" name="q" type="search" placeholder="姓名、電話、Line、Email" defaultValue={query.q || ""} />
          </label>
          <label className="field">
            <span>角色</span>
            <select className="select" name="role" defaultValue={role || "all"}>
              <option value="all">全部</option>
              {personRoleNames.map((item) => <option key={item} value={item}>{personRoleLabels[item]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>狀態</span>
            <select className="select" name="status" defaultValue={status || "all"}>
              <option value="all">全部</option>
              {personStatuses.map((item) => <option key={item} value={item}>{statusLabel[item]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>來源</span>
            <select className="select" name="source" defaultValue={source || "all"}>
              <option value="all">全部</option>
              {personSources.map((item) => <option key={item} value={item}>{sourceLabel[item]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>負責人</span>
            <select className="select" name="assigned_to" defaultValue={assignedTo}>
              <option value="">全部</option>
              {(assigneesResult.data || []).map((assignee) => (
                <option key={assignee.id} value={assignee.id}>{assigneeLabel(assignee)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>排序</span>
            <select className="select" name="sort" defaultValue={sort}>
              {sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="actions" style={{ alignItems: "end" }}>
            <button className="button" type="submit">套用</button>
            <Link className="button ghost" href="/admin/people">清除</Link>
          </div>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>顯示名稱</th>
                <th>正式姓名</th>
                <th>聯絡方式</th>
                <th>角色</th>
                <th>來源 / 狀態</th>
                <th>負責人</th>
                <th>最近聯絡</th>
                <th>建立時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td>
                    <strong>{person.display_name}</strong>
                    {person.deleted_at ? (
                      <>
                        <br />
                        <span className="muted">已封存：{formatDateTime(person.deleted_at)}</span>
                      </>
                    ) : null}
                  </td>
                  <td>{person.legal_name || "-"}</td>
                  <td>
                    {person.phone || "-"}
                    {person.line_id ? <><br /><span className="muted">Line: {person.line_id}</span></> : null}
                    {person.email ? <><br /><span className="muted">{person.email}</span></> : null}
                  </td>
                  <td>{roleBadges(person.roles)}</td>
                  <td>{sourceLabel[person.source] || person.source}<br /><span className="muted">{statusLabel[person.status] || person.status}</span></td>
                  <td>{person.assigned_to_label || "-"}</td>
                  <td>{formatDateTime(person.last_contacted_at)}</td>
                  <td>{formatDateTime(person.created_at)}</td>
                  <td>
                    <div className="actions">
                      <Link className="button ghost" href={`/admin/people/${person.id}`}>查看</Link>
                      <Link className="button ghost" href={`/admin/people/${person.id}/edit`}>編輯</Link>
                      {!person.deleted_at ? (
                        <details className="property-lifecycle-action">
                          <summary className="button danger">封存</summary>
                          <form className="property-lifecycle-form" action={archivePersonAction.bind(null, person.id)}>
                            <p className="notice">封存會設定 deleted_at 並將狀態改為 archived，不會硬刪資料。</p>
                            <button className="button danger" type="submit">確認封存</button>
                          </form>
                        </details>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!people.length ? (
                <tr>
                  <td colSpan={9}>尚未建立客戶。可以先使用「新增客戶」建立第一筆 People 主檔。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
