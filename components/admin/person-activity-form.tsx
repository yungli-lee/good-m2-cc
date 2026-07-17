import { personActivityChannels, personActivityTypes } from "@/lib/people/constants";
import {
  personActivityChannelLabels,
  personActivityTypeLabels
} from "@/lib/people/labels";
import type { PersonActivity } from "@/lib/people/types";

function taipeiDateTimeLocal(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function PersonActivityForm({
  action,
  activity,
  includeFollowUp = false,
  nextFollowUpAt
}: {
  action: (formData: FormData) => void | Promise<void>;
  activity?: PersonActivity | null;
  includeFollowUp?: boolean;
  nextFollowUpAt?: string | null;
}) {
  return (
    <form action={action} className="person-activity-form">
      <label className="field">
        <span>紀錄類型</span>
        <select className="select" name="activity_type" defaultValue={activity?.activity_type || "call"}>
          {personActivityTypes.map((type) => (
            <option key={type} value={type}>{personActivityTypeLabels[type]}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>聯絡管道</span>
        <select className="select" name="channel" defaultValue={activity?.channel || ""}>
          <option value="">未指定</option>
          {personActivityChannels.map((channel) => (
            <option key={channel} value={channel}>{personActivityChannelLabels[channel]}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>聯絡時間</span>
        <input className="input" name="occurred_at" type="datetime-local" defaultValue={taipeiDateTimeLocal(activity?.occurred_at)} required />
      </label>

      <label className="field full">
        <span>摘要 *</span>
        <input className="input" name="summary" defaultValue={activity?.summary || ""} maxLength={240} required />
      </label>

      <label className="field full">
        <span>詳細內容</span>
        <textarea className="textarea" name="details" defaultValue={activity?.details || ""} maxLength={4000} />
      </label>

      {includeFollowUp ? (
        <>
          <label className="field">
            <span>下一次跟進</span>
            <select className="select" name="follow_up_mode" defaultValue="keep">
              <option value="keep">維持目前設定</option>
              <option value="set">設定／修改</option>
              <option value="clear">清除</option>
            </select>
          </label>
          <label className="field">
            <span>跟進時間</span>
            <input className="input" name="next_follow_up_at" type="datetime-local" defaultValue={nextFollowUpAt ? taipeiDateTimeLocal(nextFollowUpAt) : ""} />
          </label>
        </>
      ) : null}

      <div className="actions field full">
        <button className="button" type="submit">{activity ? "儲存聯絡紀錄" : "新增聯絡紀錄"}</button>
      </div>
    </form>
  );
}

export { taipeiDateTimeLocal };
