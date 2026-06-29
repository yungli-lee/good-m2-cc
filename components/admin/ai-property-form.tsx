"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import type { AdminRole } from "@/lib/auth";
import { parsePastedProperty, type ParsedProperty } from "@/lib/properties/ai-parser";
import type { PropertyFormState } from "@/lib/properties/schema";

const typeOptions = [
  ["townhouse", "透天"],
  ["apartment", "公寓"],
  ["building", "大樓"],
  ["land", "土地"],
  ["farmland", "農地"],
  ["building_land", "建地"],
  ["storefront", "店面"],
  ["factory", "廠房"],
  ["other", "其他"]
];

function setFormValue(form: HTMLFormElement, name: keyof ParsedProperty, value?: string) {
  if (!value) return;
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function FieldError({ message }: { message?: string }) {
  return message ? <p style={{ color: "#b42318", fontWeight: 700, margin: 0 }}>{message}</p> : null;
}

export function AiPropertyForm({
  role,
  formAction,
  initialState
}: {
  role: AdminRole;
  formAction: (state: PropertyFormState, formData: FormData) => Promise<PropertyFormState>;
  initialState: PropertyFormState;
}) {
  const [state, action, pending] = useActionState(formAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [quickPaste, setQuickPaste] = useState("");
  const [message, setMessage] = useState("");
  const canPublish = role === "admin" || role === "owner";
  const quickPasteStats = useMemo(() => quickPaste.trim().length, [quickPaste]);

  function handleParse() {
    if (!formRef.current) return;
    if (!quickPaste.trim()) {
      setMessage("請先貼上物件資料。");
      return;
    }

    const parsed = parsePastedProperty(quickPaste);
    const form = formRef.current;
    const fields: Array<keyof ParsedProperty> = [
      "title",
      "slug",
      "address_public",
      "address_private",
      "listing_no",
      "listing_type",
      "listing_start_date",
      "listing_end_date",
      "owner_name",
      "owner_phone",
      "developer_names",
      "showing_instructions",
      "price",
      "land_area_ping",
      "building_area_ping",
      "layout",
      "age",
      "orientation",
      "floor",
      "property_type",
      "highlights",
      "description",
      "seo_title",
      "meta_description"
    ];
    fields.forEach((field) => setFormValue(form, field, parsed[field]));
    setMessage("已解析並填入表單，送出前請快速確認欄位。");
  }

  return (
    <form key={state.formKey || "initial"} ref={formRef} action={action} className="form-grid ai-property-form">
      <section className="ai-quick-paste field full" aria-label="AI 快速建立物件">
        <div className="ai-quick-paste-header">
          <div>
            <h2>AI 快速建立物件</h2>
            <p className="muted">貼上 Line 或 Word 物件資料，解析後會先填入表單，可再人工校正。</p>
          </div>
        </div>
        <textarea
          className="textarea ai-quick-paste-textarea"
          value={quickPaste}
          onChange={(event) => setQuickPaste(event.target.value)}
          placeholder="貼上案名、地址、地號、地坪、建坪、格局、坐向、屋齡、完工日、開價、底價、開發、帶看資訊、密碼、推薦特色等資料"
        />
        <div className="ai-quick-paste-actions">
          <button className="button secondary" type="button" onClick={handleParse}>
            AI 解析
          </button>
          <span className="muted">{quickPasteStats ? `${quickPasteStats} 字` : "尚未貼上內容"}</span>
        </div>
        {message ? <div className="notice">{message}</div> : null}
      </section>
      {state.formError ? <div className="notice field full">{state.formError}</div> : null}

      <div className="field">
        <label htmlFor="title">案名</label>
        <input className="input" id="title" name="title" defaultValue={state.values.title} required aria-invalid={Boolean(state.fieldErrors.title)} />
        <FieldError message={state.fieldErrors.title} />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug</label>
        <input className="input" id="slug" name="slug" defaultValue={state.values.slug} placeholder="可留空，系統會自動產生" aria-invalid={Boolean(state.fieldErrors.slug)} />
        <FieldError message={state.fieldErrors.slug} />
      </div>
      <div className="field">
        <label htmlFor="address_public">公開地址</label>
        <input className="input" id="address_public" name="address_public" defaultValue={state.values.address_public} aria-invalid={Boolean(state.fieldErrors.address_public)} />
        <FieldError message={state.fieldErrors.address_public} />
      </div>
      <div className="field">
        <label htmlFor="address_private">內部備註（後台限定）</label>
        <textarea className="textarea" id="address_private" name="address_private" defaultValue={state.values.address_private} />
      </div>
      <div className="field">
        <label htmlFor="listing_no">委託書編號</label>
        <input className="input" id="listing_no" name="listing_no" defaultValue={state.values.listing_no} />
      </div>
      <div className="field">
        <label htmlFor="listing_type">委託類型</label>
        <select className="select" id="listing_type" name="listing_type" defaultValue={state.values.listing_type}>
          <option value="">未設定</option>
          <option value="專任">專任</option>
          <option value="一般委託">一般委託</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="listing_start_date">委託起日</label>
        <input className="input" id="listing_start_date" name="listing_start_date" placeholder="2026/01/22" defaultValue={state.values.listing_start_date} />
      </div>
      <div className="field">
        <label htmlFor="listing_end_date">委託迄日</label>
        <input className="input" id="listing_end_date" name="listing_end_date" placeholder="2026/04/21" defaultValue={state.values.listing_end_date} />
      </div>
      <div className="field">
        <label htmlFor="owner_name">屋主名稱</label>
        <input className="input" id="owner_name" name="owner_name" defaultValue={state.values.owner_name} />
      </div>
      <div className="field">
        <label htmlFor="owner_phone">屋主電話</label>
        <input className="input" id="owner_phone" name="owner_phone" defaultValue={state.values.owner_phone} />
      </div>
      <div className="field">
        <label htmlFor="developer_names">開發人員</label>
        <input className="input" id="developer_names" name="developer_names" defaultValue={state.values.developer_names} />
      </div>
      <div className="field">
        <label htmlFor="showing_instructions">帶看方式</label>
        <textarea className="textarea" id="showing_instructions" name="showing_instructions" defaultValue={state.values.showing_instructions} />
      </div>
      <div className="field">
        <label htmlFor="price">開價（萬）</label>
        <input className="input" id="price" name="price" type="number" min="0" defaultValue={state.values.price} aria-invalid={Boolean(state.fieldErrors.price)} />
        <FieldError message={state.fieldErrors.price} />
      </div>
      <div className="field">
        <label htmlFor="land_area_ping">土地坪數</label>
        <input className="input" id="land_area_ping" name="land_area_ping" type="number" step="0.01" min="0" defaultValue={state.values.land_area_ping} />
      </div>
      <div className="field">
        <label htmlFor="building_area_ping">建物坪數</label>
        <input className="input" id="building_area_ping" name="building_area_ping" type="number" step="0.01" min="0" defaultValue={state.values.building_area_ping} />
      </div>
      <div className="field">
        <label htmlFor="layout">格局</label>
        <input className="input" id="layout" name="layout" defaultValue={state.values.layout} />
      </div>
      <div className="field">
        <label htmlFor="age">屋齡</label>
        <input className="input" id="age" name="age" type="number" step="0.1" min="0" defaultValue={state.values.age} />
      </div>
      <div className="field">
        <label htmlFor="orientation">座向</label>
        <input className="input" id="orientation" name="orientation" defaultValue={state.values.orientation} />
      </div>
      <div className="field">
        <label htmlFor="floor">樓層</label>
        <input className="input" id="floor" name="floor" defaultValue={state.values.floor} />
      </div>
      <div className="field">
        <label htmlFor="property_type">類型</label>
        <select className="select" id="property_type" name="property_type" defaultValue={state.values.property_type || "other"}>
          {typeOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="sort_order">排序</label>
        <input className="input" id="sort_order" name="sort_order" type="number" defaultValue={state.values.sort_order || "1000"} />
      </div>
      <div className="field">
        <label htmlFor="status">上架狀態</label>
        <select className="select" id="status" name="status" defaultValue={state.values.status || "draft"} disabled={!canPublish}>
          <option value="draft">草稿</option>
          <option value="published">已上架</option>
          <option value="archived">下架</option>
        </select>
        {!canPublish ? <input type="hidden" name="status" value="draft" /> : null}
      </div>
      {canPublish ? (
        <div className="field">
          <label>
            <input type="checkbox" name="is_featured" defaultChecked={state.values.is_featured} /> 設為精選
          </label>
        </div>
      ) : null}
      <div className="field full">
        <label htmlFor="highlights">推薦特色</label>
        <textarea className="textarea" id="highlights" name="highlights" placeholder="每行一個特色" defaultValue={state.values.highlights} />
      </div>
      <div className="field full">
        <label htmlFor="description">詳細介紹</label>
        <textarea className="textarea" id="description" name="description" defaultValue={state.values.description} />
      </div>
      <div className="field">
        <label htmlFor="seo_title">SEO Title</label>
        <input className="input" id="seo_title" name="seo_title" defaultValue={state.values.seo_title} />
      </div>
      <div className="field">
        <label htmlFor="meta_description">Meta Description</label>
        <input className="input" id="meta_description" name="meta_description" defaultValue={state.values.meta_description} />
      </div>
      <input type="hidden" name="og_image_url" value={state.values.og_image_url} />
      <input type="hidden" name="canonical_url" value={state.values.canonical_url} />
      <div className="field full">
        <button className="button" type="submit" disabled={pending}>{pending ? "建立中..." : "建立物件"}</button>
      </div>
    </form>
  );
}
