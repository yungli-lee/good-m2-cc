import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PersonActivityForm, taipeiDateTimeLocal } from "@/components/admin/person-activity-form";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import {
  personActivityChannelLabels,
  personActivityTypeLabels,
  personRoleLabels
} from "@/lib/people/labels";
import { getAdminPerson, listPersonActivities } from "@/lib/people/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createPersonActivityAction,
  softDeletePersonActivityAction,
  updatePersonFollowUpAction
} from "../activity-actions";
import { archivePersonAction } from "../actions";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const sourceLabel: Record<string, string> = {
  manual: "手動建立",
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

const savedMessage: Record<string, string> = {
  created: "客戶已建立。",
  updated: "客戶已更新。",
  archived: "客戶已封存。",
  activity_created: "聯絡紀錄已新增。",
  activity_updated: "聯絡紀錄已更新。",
  activity_deleted: "聯絡紀錄已刪除。",
  follow_up_updated: "下一次跟進時間已更新。",
  follow_up_cleared: "下一次跟進時間已清除。"
};

const errorMessage: Record<string, string> = {
  archive_failed: "封存失敗，請稍後再試。",
  activity_invalid: "聯絡紀錄欄位格式不正確。",
  activity_create_failed: "聯絡紀錄新增失敗。",
  activity_update_failed: "聯絡紀錄更新失敗。",
  activity_delete_failed: "聯絡紀錄刪除失敗。",
  follow_up_invalid: "下一次跟進時間格式不正確。",
  follow_up_update_failed: "下一次跟進時間更新失敗。",
  forbidden: "目前帳號沒有操作此客戶的權限。"
};

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "-"}</dd>
    </div>
  );
}

export default async function PersonDetailPage({ params, searchParams }: Props) {
  await requireRole(["editor", "admin", "owner"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createSupabaseServerClient();
  const [{ data: person }, { data: activities, error: activityError }] = await Promise.all([
    getAdminPerson(supabase, id),
    listPersonActivities(supabase, id)
  ]);
  if (!person) notFound();

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>{person.display_name}</h1>
            <p className="muted">People 主檔詳細資料。</p>
          </div>
          <div className="actions">
            <Link className="button ghost" href="/admin/people">返回列表</Link>
            <Link className="button" href={`/admin/people/${person.id}/edit`}>編輯</Link>
          </div>
        </div>

        {query.saved ? <div className="notice">{savedMessage[query.saved] || "已儲存。"}</div> : null}
        {query.error ? <div className="notice">{errorMessage[query.error] || "操作失敗，請稍後再試。"}</div> : null}

        <div className="detail-layout">
          <section className="card">
            <div className="card-body">
              <h2 style={{ marginTop: 0 }}>基本資料</h2>
              <dl className="company-info-panel" style={{ borderTop: 0, paddingTop: 0 }}>
                <Field label="顯示名稱" value={person.display_name} />
                <Field label="正式姓名" value={person.legal_name} />
                <Field label="手機 / 電話" value={person.phone} />
                <Field label="Line ID" value={person.line_id} />
                <Field label="Email" value={person.email} />
                <Field label="來源" value={sourceLabel[person.source] || person.source} />
                <Field label="狀態" value={statusLabel[person.status] || person.status} />
                <Field label="負責人" value={person.assigned_to_label} />
                <Field label="最近聯絡" value={formatDateTime(person.last_contacted_at)} />
                <Field label="下一次跟進" value={formatDateTime(person.next_follow_up_at)} />
                <Field label="建立時間" value={formatDateTime(person.created_at)} />
                <Field label="更新時間" value={formatDateTime(person.updated_at)} />
                {person.deleted_at ? <Field label="封存時間" value={formatDateTime(person.deleted_at)} /> : null}
              </dl>
            </div>
          </section>

          <aside className="card">
            <div className="card-body">
              <h2 style={{ marginTop: 0 }}>角色</h2>
              <div className="actions">
                {person.roles.length ? person.roles.map((role) => (
                  <span key={role} className="admin-users-badge is-active">{personRoleLabels[role]}</span>
                )) : <span className="muted">未設定角色</span>}
              </div>
              <h2>備註</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{person.notes || "尚無備註。"}</p>
              {!person.deleted_at ? (
                <details className="property-lifecycle-action">
                  <summary className="button danger">封存客戶</summary>
                  <form className="property-lifecycle-form" action={archivePersonAction.bind(null, person.id)}>
                    <p className="notice">封存會設定 deleted_at 並將狀態改為 archived，不會硬刪資料。</p>
                    <button className="button danger" type="submit">確認封存</button>
                  </form>
                </details>
              ) : null}
            </div>
          </aside>
        </div>

        <section className="person-follow-up-card card">
          <div className="card-body">
            <div>
              <h2>下一次跟進</h2>
              <p className="muted">目前設定：{formatDateTime(person.next_follow_up_at)}</p>
            </div>
            <form className="person-follow-up-form" action={updatePersonFollowUpAction.bind(null, person.id)}>
              <label className="field">
                <span>跟進時間（留空即清除）</span>
                <input
                  className="input"
                  name="next_follow_up_at"
                  type="datetime-local"
                  defaultValue={person.next_follow_up_at ? taipeiDateTimeLocal(person.next_follow_up_at) : ""}
                />
              </label>
              <button className="button" type="submit">儲存跟進時間</button>
            </form>
          </div>
        </section>

        <section className="person-activity-section" id="activity-timeline">
          <div className="person-activity-layout">
            <div className="card">
              <div className="card-body">
                <h2>新增聯絡紀錄</h2>
                <p className="muted">新增後會同步更新最近聯絡時間；也可一併調整下一次跟進。</p>
                <PersonActivityForm
                  action={createPersonActivityAction.bind(null, person.id)}
                  includeFollowUp
                  nextFollowUpAt={person.next_follow_up_at}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2>聯絡紀錄 Timeline</h2>
                {activityError ? <div className="notice">聯絡紀錄讀取失敗。</div> : null}
                {!activityError && !activities.length ? (
                  <div className="person-activity-empty">
                    <strong>尚無聯絡紀錄</strong>
                    <p>新增第一筆電話、訊息、Email、會面或內部紀錄。</p>
                  </div>
                ) : null}
                <div className="person-activity-timeline">
                  {activities.map((activity) => (
                    <article className="person-activity-item" key={activity.id}>
                      <div className="person-activity-marker" aria-hidden="true" />
                      <div className="person-activity-content">
                        <div className="person-activity-heading">
                          <div>
                            <strong>{personActivityTypeLabels[activity.activity_type]}</strong>
                            <span className="muted"> · {formatDateTime(activity.occurred_at)}</span>
                            {activity.channel ? <span className="muted"> · {personActivityChannelLabels[activity.channel]}</span> : null}
                          </div>
                          <div className="actions">
                            <Link className="button ghost" href={`/admin/people/${person.id}/activities/${activity.id}/edit`}>編輯</Link>
                            <form action={softDeletePersonActivityAction.bind(null, person.id, activity.id)}>
                              <button className="button danger" type="submit">刪除</button>
                            </form>
                          </div>
                        </div>
                        <p className="person-activity-summary">{activity.summary}</p>
                        {activity.details ? <p className="muted person-activity-details">{activity.details}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
