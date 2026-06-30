"use client";

import { useActionState } from "react";
import type { CompanySettings } from "@/lib/company-settings";
import { updateCompanySettingsAction } from "@/app/admin/settings/company/actions";

type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p style={{ color: "#b42318", fontWeight: 700, margin: 0 }}>{message}</p> : null;
}

export function CompanySettingsForm({ settings }: { settings: CompanySettings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateCompanySettingsAction, {});

  return (
    <form className="form-grid" action={action}>
      {state.error ? <div className="notice field full">{state.error}</div> : null}
      <div className="field">
        <label htmlFor="company_name">公司名稱</label>
        <input className="input" id="company_name" name="company_name" defaultValue={settings.company_name} required />
        <FieldError message={state.fieldErrors?.company_name} />
      </div>
      <div className="field">
        <label htmlFor="franchise_name">加盟店</label>
        <input className="input" id="franchise_name" name="franchise_name" defaultValue={settings.franchise_name} required />
        <FieldError message={state.fieldErrors?.franchise_name} />
      </div>
      <div className="field">
        <label htmlFor="brokerage_license_no">經紀業特許字號</label>
        <input className="input" id="brokerage_license_no" name="brokerage_license_no" defaultValue={settings.brokerage_license_no} required />
        <FieldError message={state.fieldErrors?.brokerage_license_no} />
      </div>
      <div className="field">
        <label htmlFor="realtor_certificate_no">不動產經紀人證號</label>
        <input className="input" id="realtor_certificate_no" name="realtor_certificate_no" defaultValue={settings.realtor_certificate_no} required />
        <FieldError message={state.fieldErrors?.realtor_certificate_no} />
      </div>
      <div className="field full">
        <button className="button" type="submit" disabled={pending}>{pending ? "儲存中..." : "儲存公司資料"}</button>
      </div>
    </form>
  );
}
