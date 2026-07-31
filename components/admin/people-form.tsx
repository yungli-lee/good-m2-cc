"use client";

import { useActionState } from "react";
import { personRoleNames, personSources, personStatuses } from "@/lib/people/constants";
import { personRoleLabels } from "@/lib/people/labels";
import type { PersonAssignee } from "@/lib/people/types";
import type { PersonFormState } from "@/lib/people/schema";

type PersonAction = (
  state: PersonFormState,
  formData: FormData
) => Promise<PersonFormState>;

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

function FieldError({ message }: { message?: string }) {
  return message ? <p style={{ color: "#b42318", fontWeight: 700, margin: 0 }}>{message}</p> : null;
}

function assigneeLabel(assignee: PersonAssignee) {
  return assignee.display_name || assignee.email || assignee.id;
}

export function PeopleForm({
  action,
  initialState,
  assignees,
  submitLabel = "儲存",
  pendingLabel = "儲存中..."
}: {
  action: PersonAction;
  initialState: PersonFormState;
  assignees: PersonAssignee[];
  submitLabel?: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = state?.values || initialState.values;
  const fieldErrors = state?.fieldErrors || {};
  const selectedRoles = new Set(values.roles);

  return (
    <form action={formAction} className="form-grid">
      {state?.formError ? <div className="notice field full">{state.formError}</div> : null}

      <label className="field">
        <span>顯示名稱 *</span>
        <input className="input" name="display_name" defaultValue={values.display_name} required maxLength={120} />
        <FieldError message={fieldErrors.display_name} />
      </label>

      <label className="field">
        <span>正式姓名</span>
        <input className="input" name="legal_name" defaultValue={values.legal_name} maxLength={120} />
        <FieldError message={fieldErrors.legal_name} />
      </label>

      <label className="field">
        <span>手機 / 電話</span>
        <input className="input" name="phone" defaultValue={values.phone} maxLength={40} autoComplete="tel" />
        <FieldError message={fieldErrors.phone} />
      </label>

      <label className="field">
        <span>Line ID</span>
        <input className="input" name="line_id" defaultValue={values.line_id} maxLength={120} />
        <FieldError message={fieldErrors.line_id} />
      </label>

      <label className="field">
        <span>Email</span>
        <input className="input" name="email" type="email" defaultValue={values.email} maxLength={180} autoComplete="email" />
        <FieldError message={fieldErrors.email} />
      </label>

      <label className="field full">
        <span>地址</span>
        <input className="input" name="address" defaultValue={values.address} maxLength={240} autoComplete="street-address" />
        <FieldError message={fieldErrors.address} />
      </label>

      <label className="field">
        <span>來源</span>
        <select className="select" name="source" defaultValue={values.source}>
          {personSources.map((source) => (
            <option key={source} value={source}>{sourceLabel[source]}</option>
          ))}
        </select>
        <FieldError message={fieldErrors.source} />
      </label>

      <label className="field">
        <span>狀態</span>
        <select className="select" name="status" defaultValue={values.status}>
          {personStatuses.map((status) => (
            <option key={status} value={status}>{statusLabel[status]}</option>
          ))}
        </select>
        <FieldError message={fieldErrors.status} />
      </label>

      <label className="field">
        <span>負責人</span>
        <select className="select" name="assigned_to" defaultValue={values.assigned_to}>
          <option value="">未指派</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>{assigneeLabel(assignee)}</option>
          ))}
        </select>
        <FieldError message={fieldErrors.assigned_to} />
      </label>

      <fieldset className="field full" style={{ border: "1px solid rgba(16,35,67,0.12)", borderRadius: 8, padding: 14 }}>
        <legend style={{ fontWeight: 700 }}>角色</legend>
        <div className="actions">
          {personRoleNames.map((role) => (
            <label key={role} className="admin-users-checkbox">
              <input name="roles" type="checkbox" value={role} defaultChecked={selectedRoles.has(role)} />
              <span>{personRoleLabels[role]}</span>
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.roles} />
      </fieldset>

      <label className="field full">
        <span>備註</span>
        <textarea className="textarea" name="notes" defaultValue={values.notes} maxLength={4000} />
        <FieldError message={fieldErrors.notes} />
      </label>

      <div className="actions field full">
        <button className="button" type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
