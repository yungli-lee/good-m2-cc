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
    <form className="form-grid" action={action} encType="multipart/form-data">
      {state.error ? <div className="notice field full">{state.error}</div> : null}
      <div className="field full">
        <h2 style={{ margin: 0 }}>基本資料</h2>
      </div>
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
      <div className="field">
        <label htmlFor="salesperson_registration_no">營業員登記證號</label>
        <input className="input" id="salesperson_registration_no" name="salesperson_registration_no" defaultValue={settings.salesperson_registration_no} />
        <FieldError message={state.fieldErrors?.salesperson_registration_no} />
      </div>
      <div className="field">
        <label htmlFor="company_phone">公司電話</label>
        <input className="input" id="company_phone" name="company_phone" defaultValue={settings.company_phone} />
        <FieldError message={state.fieldErrors?.company_phone} />
      </div>
      <div className="field">
        <label htmlFor="company_address">公司地址</label>
        <input className="input" id="company_address" name="company_address" defaultValue={settings.company_address} />
        <FieldError message={state.fieldErrors?.company_address} />
      </div>
      <div className="field">
        <label htmlFor="company_email">Email</label>
        <input className="input" id="company_email" name="company_email" type="email" defaultValue={settings.company_email} />
        <FieldError message={state.fieldErrors?.company_email} />
      </div>

      <div className="field full">
        <h2 style={{ margin: "10px 0 0" }}>連結資料</h2>
      </div>
      <div className="field">
        <label htmlFor="google_maps_url">Google Maps 連結</label>
        <input className="input" id="google_maps_url" name="google_maps_url" type="url" defaultValue={settings.google_maps_url} />
        <FieldError message={state.fieldErrors?.google_maps_url} />
      </div>
      <div className="field">
        <label htmlFor="facebook_url">Facebook 連結</label>
        <input className="input" id="facebook_url" name="facebook_url" type="url" defaultValue={settings.facebook_url} />
        <FieldError message={state.fieldErrors?.facebook_url} />
      </div>
      <div className="field">
        <label htmlFor="instagram_url">Instagram 連結</label>
        <input className="input" id="instagram_url" name="instagram_url" type="url" defaultValue={settings.instagram_url} />
        <FieldError message={state.fieldErrors?.instagram_url} />
      </div>
      <div className="field">
        <label htmlFor="youtube_url">YouTube 連結</label>
        <input className="input" id="youtube_url" name="youtube_url" type="url" defaultValue={settings.youtube_url} />
        <FieldError message={state.fieldErrors?.youtube_url} />
      </div>
      <div className="field">
        <label htmlFor="tiktok_url">TikTok 連結</label>
        <input className="input" id="tiktok_url" name="tiktok_url" type="url" defaultValue={settings.tiktok_url} />
        <FieldError message={state.fieldErrors?.tiktok_url} />
      </div>
      <div className="field">
        <label htmlFor="line_url">LINE 連結</label>
        <input className="input" id="line_url" name="line_url" type="url" defaultValue={settings.line_url} />
        <FieldError message={state.fieldErrors?.line_url} />
      </div>

      <div className="field full">
        <h2 style={{ margin: "10px 0 0" }}>圖片資料</h2>
      </div>
      <div className="field">
        <label htmlFor="logo_url">公司 Logo URL</label>
        <input className="input" id="logo_url" name="logo_url" type="url" defaultValue={settings.logo_url} />
        <FieldError message={state.fieldErrors?.logo_url} />
      </div>
      <div className="field">
        <label htmlFor="logo_file">上傳公司 Logo</label>
        <input className="input" id="logo_file" name="logo_file" type="file" accept="image/*" />
        <span className="muted">可直接上傳圖片；上傳後會自動寫入 Logo URL。</span>
      </div>
      <div className="field">
        <label htmlFor="line_qr_code_url">LINE QR Code URL</label>
        <input className="input" id="line_qr_code_url" name="line_qr_code_url" type="url" defaultValue={settings.line_qr_code_url} />
        <FieldError message={state.fieldErrors?.line_qr_code_url} />
      </div>
      <div className="field">
        <label htmlFor="line_qr_code_file">上傳 LINE QR Code</label>
        <input className="input" id="line_qr_code_file" name="line_qr_code_file" type="file" accept="image/*" />
        <span className="muted">可直接上傳圖片；上傳後會自動寫入 LINE QR Code URL。</span>
      </div>

      <div className="field full">
        <h2 style={{ margin: "10px 0 0" }}>頁尾資料</h2>
      </div>
      <div className="field full">
        <label htmlFor="copyright_text">Copyright 文字</label>
        <input className="input" id="copyright_text" name="copyright_text" defaultValue={settings.copyright_text} />
        <FieldError message={state.fieldErrors?.copyright_text} />
      </div>
      <div className="field full">
        <button className="button" type="submit" disabled={pending}>{pending ? "儲存中..." : "儲存公司資料"}</button>
      </div>
    </form>
  );
}
