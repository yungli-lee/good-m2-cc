import { notFound } from "next/navigation";
import Link from "next/link";
import { PropertyForm } from "@/components/admin/property-form";
import { PropertyMediaManager } from "@/components/admin/property-media-manager";
import { PropertyTimeline } from "@/components/admin/property-timeline";
import { requireRole } from "@/lib/auth";
import { calculatePropertyHealthScore } from "@/lib/properties/health-score";
import { getAdminPropertyById } from "@/lib/properties/queries";
import { listPropertyTimelineEvents } from "@/lib/properties/timeline-queries";
import type { Property } from "@/lib/properties/types";
import { permanentDeletePropertyAction, restorePropertyAction } from "../../actions";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; timeline_error?: string; timeline_saved?: string; timeline_updated?: string; timeline_deleted?: string }>;
};

const errorMessage: Record<string, string> = {
  "42501": "資料庫權限不足，請確認此帳號的後台角色與物件 RLS 權限。",
  forbidden: "此帳號沒有足夠權限。",
  invalid_form: "表單欄位格式有誤，請檢查後再儲存。",
  no_file: "請先選擇照片。",
  invalid_file: "照片格式或大小不符合規定，請使用 JPG、PNG 或 WebP，單張 5MB 以內。",
  media_failed: "照片資料寫入失敗，請稍後再試。",
  media_metadata_missing_required_field: "照片資料缺少必要欄位，請重新上傳。",
  media_not_found: "找不到要刪除的照片。",
  not_found: "找不到此物件。",
  use_lifecycle_action: "上架、下架與重新上架請使用物件列表的生命週期操作。",
  restore_failed: "還原失敗，請稍後再試。",
  permanent_delete_failed: "永久刪除失敗，請稍後再試。"
};

export default async function EditPropertyPage({ params, searchParams }: Props) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const { id } = await params;
  const query = await searchParams;
  const { data, error } = await getAdminPropertyById(id);
  if (error || !data) notFound();
  const { data: timelineEvents, error: timelineError } = await listPropertyTimelineEvents(id);

  const property = data as Property;
  const health = calculatePropertyHealthScore(property);
  const missing = health.missing.slice(0, 6);
  const activeMedia = (property.property_media || []).filter((item) => !item.deleted_at);

  return (
    <main className="section">
      <div className="container">
        <h1>編輯物件</h1>
        <p className="muted">B-001：物件健康度協助檢查上架資料完整度。目前狀態：{property.status}</p>
        {query.saved ? <div className="notice">已儲存。</div> : null}
        {query.error ? <div className="notice">{errorMessage[query.error] || `操作失敗：${query.error}`}</div> : null}
        {property.deleted_at ? (
          <div className="notice">
            此物件已刪除，不會出現在前台。刪除時間：{property.deleted_at.replace("T", " ").slice(0, 16)}
            {property.delete_reason ? `；原因：${property.delete_reason}` : ""}
          </div>
        ) : null}
        <div className="property-health-panel">
          <div className="property-health">
            <span className={`property-health-badge is-${health.level}`}>{health.score}</span>
            <div>
              <h2>{health.label}</h2>
              <p className="muted">{missing.length ? `優先補齊：${missing.map((item) => item.label).join("、")}` : "資料完整度良好。"}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            {property.deleted_at ? (
              current.profile.role === "admin" || current.profile.role === "owner" ? (
                <div className="actions">
                  <form action={restorePropertyAction.bind(null, property.id)}>
                    <button className="button" type="submit">還原物件</button>
                  </form>
                  <details className="property-lifecycle-action">
                    <summary className="button danger">永久刪除</summary>
                    <form className="property-lifecycle-form" action={permanentDeletePropertyAction.bind(null, property.id)}>
                      <p className="notice">此動作不可復原。</p>
                      <button className="button danger" type="submit">確認永久刪除</button>
                    </form>
                  </details>
                </div>
              ) : (
                <div className="notice">此物件已刪除，僅 owner/admin 可還原或永久刪除。</div>
              )
            ) : (
              <>
                <PropertyForm key={property.id} property={property} role={current.profile.role} formAction={`/admin/properties/${property.id}/edit/save`} />
                <PropertyMediaManager
                  media={activeMedia}
                  uploadAction={`/admin/properties/${property.id}/edit/upload`}
                  setCoverAction={`/admin/properties/${property.id}/edit/cover`}
                  deleteActionBase={`/admin/properties/${property.id}/edit/media`}
                />
              </>
            )}
            <div className="actions">
              <Link className="button ghost" href="/admin/properties">返回物件列表</Link>
            </div>
          </div>
        </div>
        {timelineError ? <div className="notice">時間軸資料讀取失敗。</div> : null}
        <PropertyTimeline
          propertyId={property.id}
          events={timelineEvents || []}
          role={current.profile.role}
          errorCode={query.timeline_error}
          saved={query.timeline_saved === "1"}
          updated={query.timeline_updated === "1"}
          deleted={query.timeline_deleted === "1"}
        />
      </div>
    </main>
  );
}
