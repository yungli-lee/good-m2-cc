import { notFound } from "next/navigation";
import Link from "next/link";
import { PropertyForm } from "@/components/admin/property-form";
import { PropertyTimeline } from "@/components/admin/property-timeline";
import { requireRole } from "@/lib/auth";
import { calculatePropertyHealthScore } from "@/lib/properties/health-score";
import { getAdminPropertyById } from "@/lib/properties/queries";
import { listPropertyTimelineEvents } from "@/lib/properties/timeline-queries";
import type { Property } from "@/lib/properties/types";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; timeline_error?: string; timeline_saved?: string; timeline_deleted?: string }>;
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

  return (
    <main className="section">
      <div className="container">
        <h1>編輯物件</h1>
        <p className="muted">B-001：物件健康度協助檢查上架資料完整度。目前狀態：{property.status}</p>
        {query.saved ? <div className="notice">已儲存。</div> : null}
        {query.error ? <div className="notice">操作失敗：{query.error}</div> : null}
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
            <PropertyForm key={property.id} property={property} role={current.profile.role} formAction={`/admin/properties/${property.id}/edit/save`} />
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
          deleted={query.timeline_deleted === "1"}
        />
      </div>
    </main>
  );
}
