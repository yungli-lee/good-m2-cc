import Link from "next/link";
import { AiPropertyForm } from "@/components/admin/ai-property-form";
import { requireRole } from "@/lib/auth";
import type { PropertyFormState } from "@/lib/properties/schema";
import { createPropertyAction } from "../actions";

export const runtime = "edge";

export default async function NewPropertyPage() {
  const current = await requireRole(["editor", "admin", "owner"]);
  const initialState: PropertyFormState = {
    values: {
      title: "",
      slug: "",
      address_public: "",
      address_private: "",
      listing_no: "",
      listing_type: "",
      listing_start_date: "",
      listing_end_date: "",
      owner_name: "",
      owner_phone: "",
      developer_names: "",
      showing_instructions: "",
      progress_notes: "",
      frontage: "",
      depth: "",
      price: "",
      land_area_ping: "",
      building_area_ping: "",
      layout: "",
      age: "",
      orientation: "",
      floor: "",
      property_type: "other",
      highlights: "",
      description: "",
      status: "draft",
      is_featured: false,
      sort_order: "1000",
      seo_title: "",
      meta_description: "",
      og_image_url: "",
      canonical_url: ""
    },
    fieldErrors: {}
  };

  return (
    <main className="section">
      <div className="container">
        <div className="card">
          <div className="card-body">
            <h1 style={{ marginTop: 0 }}>新增物件</h1>
            <p className="muted">貼上一段物件資料後按 AI 解析，系統會先完成主要欄位，送出前仍可人工調整。</p>
            <AiPropertyForm role={current.profile.role} formAction={createPropertyAction} initialState={initialState} />
            <div className="actions">
              <Link className="button ghost" href="/admin/properties">返回物件列表</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
