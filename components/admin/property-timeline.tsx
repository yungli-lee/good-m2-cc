import {
  canCreatePropertyTimeline,
  canManagePropertyTimeline,
  formatTimelineDate,
  getPropertyTimelineLabel,
  propertyTimelineCreatePath,
  propertyTimelineDeletePath,
  propertyTimelineEventTypes,
  propertyTimelineLabels,
  todayTaipeiDate
} from "@/lib/properties/timeline";
import type { PropertyTimelineEvent } from "@/lib/properties/timeline";
import type { AdminRole } from "@/lib/auth";

const timelineErrorMessage: Record<string, string> = {
  invalid_form: "時間軸資料格式不完整，請確認日期、類型與標題。",
  create_failed: "時間軸新增失敗，請稍後再試。",
  delete_failed: "時間軸刪除失敗，請稍後再試。"
};

type Props = {
  propertyId: string;
  events: PropertyTimelineEvent[];
  role: AdminRole;
  errorCode?: string;
  saved?: boolean;
  deleted?: boolean;
};

export function PropertyTimeline({ propertyId, events, role, errorCode, saved, deleted }: Props) {
  const canCreate = canCreatePropertyTimeline(role);
  const canDelete = canManagePropertyTimeline(role);

  return (
    <section className="property-timeline-section">
      <div className="property-timeline-header">
        <div>
          <h2>物件時間軸</h2>
          <p className="muted">結構化記錄新接委託、上架、帶看、議價、調價、成交與備註。</p>
        </div>
      </div>

      {saved ? <div className="notice">時間軸已新增。</div> : null}
      {deleted ? <div className="notice">時間軸已刪除。</div> : null}
      {errorCode ? <div className="notice">{timelineErrorMessage[errorCode] || "時間軸操作失敗。"}</div> : null}

      {canCreate ? (
        <form className="property-timeline-form" action={propertyTimelineCreatePath(propertyId)} method="post">
          <div className="field">
            <label htmlFor="timeline-event-date">日期</label>
            <input className="input" id="timeline-event-date" name="event_date" type="date" defaultValue={todayTaipeiDate()} required />
          </div>
          <div className="field">
            <label htmlFor="timeline-event-type">類型</label>
            <select className="select" id="timeline-event-type" name="event_type" defaultValue="follow_up">
              {propertyTimelineEventTypes.map((type) => (
                <option key={type} value={type}>{propertyTimelineLabels[type].label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="timeline-title">標題</label>
            <input className="input" id="timeline-title" name="title" maxLength={120} required />
          </div>
          <div className="field full">
            <label htmlFor="timeline-content">內容</label>
            <textarea className="textarea" id="timeline-content" name="content" maxLength={2000} />
          </div>
          <div className="field full">
            <button className="button" type="submit">新增時間軸事件</button>
          </div>
        </form>
      ) : null}

      <div className="property-timeline-list">
        {(events || []).map((event, index) => {
          const label = getPropertyTimelineLabel(event.event_type);
          const eventId = event.id || `${event.event_date || "unknown"}-${event.created_at || index}`;
          return (
            <article className="property-timeline-item" key={eventId}>
              <div className="property-timeline-date">{formatTimelineDate(event.event_date)}</div>
              <div className="property-timeline-body">
                <div className="property-timeline-title">
                  <span aria-hidden="true">{label.icon}</span>
                  <strong>{event.title || label.label}</strong>
                </div>
                {event.content ? <p>{event.content}</p> : null}
                {event.created_by_email ? <p className="muted">建立者：{event.created_by_email}</p> : null}
              </div>
              {canDelete && event.id ? (
                <form action={propertyTimelineDeletePath(propertyId, event.id)} method="post">
                  <button className="button danger" type="submit">刪除</button>
                </form>
              ) : null}
            </article>
          );
        })}
        {(events || []).length === 0 ? <div className="notice">尚未建立時間軸事件。</div> : null}
      </div>
    </section>
  );
}
