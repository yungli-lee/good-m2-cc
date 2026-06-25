import type { Property } from "@/lib/properties/types";
import type { AdminRole } from "@/lib/auth";

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

export function PropertyForm({
  property,
  role,
  formAction
}: {
  property?: Property | null;
  role: AdminRole;
  formAction: string | ((formData: FormData) => Promise<void>);
}) {
  const canPublish = role === "admin" || role === "owner";

  return (
    <form action={formAction} className="form-grid">
      <div className="field">
        <label htmlFor="title">案名</label>
        <input className="input" id="title" name="title" defaultValue={property?.title || ""} required />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug</label>
        <input className="input" id="slug" name="slug" defaultValue={property?.slug || ""} placeholder="可留空，系統會自動產生" />
      </div>
      <div className="field">
        <label htmlFor="address_public">公開地址</label>
        <input className="input" id="address_public" name="address_public" defaultValue={property?.address_public || ""} />
      </div>
      <div className="field">
        <label htmlFor="address_private">完整地址（後台限定）</label>
        <input className="input" id="address_private" name="address_private" defaultValue={property?.address_private || ""} />
      </div>
      <div className="field">
        <label htmlFor="price">開價</label>
        <input className="input" id="price" name="price" type="number" min="0" defaultValue={property?.price || ""} />
      </div>
      <div className="field">
        <label htmlFor="land_area_ping">土地坪數</label>
        <input className="input" id="land_area_ping" name="land_area_ping" type="number" step="0.01" min="0" defaultValue={property?.land_area_ping || ""} />
      </div>
      <div className="field">
        <label htmlFor="building_area_ping">建物坪數</label>
        <input className="input" id="building_area_ping" name="building_area_ping" type="number" step="0.01" min="0" defaultValue={property?.building_area_ping || ""} />
      </div>
      <div className="field">
        <label htmlFor="layout">格局</label>
        <input className="input" id="layout" name="layout" defaultValue={property?.layout || ""} />
      </div>
      <div className="field">
        <label htmlFor="age">屋齡</label>
        <input className="input" id="age" name="age" type="number" step="0.1" min="0" defaultValue={property?.age || ""} />
      </div>
      <div className="field">
        <label htmlFor="orientation">座向</label>
        <input className="input" id="orientation" name="orientation" defaultValue={property?.orientation || ""} />
      </div>
      <div className="field">
        <label htmlFor="floor">樓層</label>
        <input className="input" id="floor" name="floor" defaultValue={property?.floor || ""} />
      </div>
      <div className="field">
        <label htmlFor="property_type">類型</label>
        <select className="select" id="property_type" name="property_type" defaultValue={property?.property_type || "other"}>
          {typeOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="sort_order">排序</label>
        <input className="input" id="sort_order" name="sort_order" type="number" defaultValue={property?.sort_order ?? 1000} />
      </div>
      <div className="field">
        <label htmlFor="status">上架狀態</label>
        <select className="select" id="status" name="status" defaultValue={property?.status || "draft"} disabled={!canPublish}>
          <option value="draft">草稿</option>
          <option value="published">已上架</option>
          <option value="archived">下架</option>
        </select>
        {!canPublish ? <input type="hidden" name="status" value="draft" /> : null}
      </div>
      {canPublish ? (
        <div className="field">
          <label>
            <input type="checkbox" name="is_featured" defaultChecked={property?.is_featured || false} /> 設為精選
          </label>
        </div>
      ) : null}
      <div className="field full">
        <label htmlFor="highlights">物件特色</label>
        <textarea className="textarea" id="highlights" name="highlights" defaultValue={(property?.highlights || []).join("\n")} />
      </div>
      <div className="field full">
        <label htmlFor="description">詳細介紹</label>
        <textarea className="textarea" id="description" name="description" defaultValue={property?.description || ""} />
      </div>
      <div className="field">
        <label htmlFor="seo_title">SEO 網頁標題</label>
        <input className="input" id="seo_title" name="seo_title" defaultValue={property?.seo_title || ""} />
      </div>
      <div className="field">
        <label htmlFor="meta_description">Meta Description</label>
        <input className="input" id="meta_description" name="meta_description" defaultValue={property?.meta_description || ""} />
      </div>
      <div className="field">
        <label htmlFor="og_image_url">OG Image</label>
        <input className="input" id="og_image_url" name="og_image_url" defaultValue={property?.og_image_url || ""} />
      </div>
      <div className="field">
        <label htmlFor="canonical_url">Canonical URL</label>
        <input className="input" id="canonical_url" name="canonical_url" defaultValue={property?.canonical_url || ""} />
      </div>
      <div className="field full">
        <button className="button" type="submit">儲存物件</button>
      </div>
    </form>
  );
}
