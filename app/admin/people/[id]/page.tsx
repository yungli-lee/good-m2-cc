import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { personRoleLabels } from "@/lib/people/labels";
import { getAdminPerson } from "@/lib/people/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPersonProperties } from "@/lib/people-properties";
import { PeoplePropertiesPanel } from "@/components/admin/people-properties-panel";
import { archivePersonAction } from "../actions";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; relation_error?: string; relation_saved?: string }>;
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
  archived: "客戶已封存。"
};

const errorMessage: Record<string, string> = {
  archive_failed: "封存失敗，請稍後再試。",
  invalid: "關聯欄位格式有誤，請檢查關係與日期。",
  duplicate: "此客戶與物件已存在相同的有效關係。",
  permission: "你沒有建立或修改關聯的權限。",
  missing: "找不到指定的客戶或物件。",
  schema_missing: "Preview 尚未完成 People–Property 資料表設定，請通知管理者。",
  save: "關聯儲存失敗，請稍後再試。",
  update: "關聯更新失敗，請稍後再試。",
  archive: "關聯封存失敗，請稍後再試。"
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
  const { data: person } = await getAdminPerson(supabase, id);
  if (!person) notFound();
  const [{ data: relations }, { data: properties }] = await Promise.all([
    listPersonProperties(supabase, id),
    supabase.from("properties").select("id,title,slug").is("deleted_at", null).order("updated_at", { ascending: false }).limit(100)
  ]);

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
        {query.relation_saved ? <div className="notice">{query.relation_saved === "archived" ? "關聯已封存。" : query.relation_saved === "updated" ? "關聯已更新。" : "關聯已建立。"}</div> : null}
        {query.relation_error ? <div className="notice">{errorMessage[query.relation_error] || "關聯操作失敗，請稍後再試。"}</div> : null}

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
        <PeoplePropertiesPanel personId={id} relations={(relations || []) as never[]} properties={properties || []} />
      </div>
    </main>
  );
}
