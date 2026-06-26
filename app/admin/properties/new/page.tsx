import Link from "next/link";
import { DraftPropertyForm } from "@/components/admin/draft-property-form";
import { requireRole } from "@/lib/auth";
import type { DraftPropertyFormState } from "@/lib/properties/schema";
import { createDraftPropertyAction } from "../actions";

export const runtime = "edge";

export default async function NewPropertyPage() {
  await requireRole(["editor", "admin", "owner"]);
  const initialDraftPropertyFormState: DraftPropertyFormState = {
    values: {
      title: "",
      slug: "",
      price: "",
      address_public: ""
    },
    fieldErrors: {}
  };

  return (
    <main className="section">
      <div className="container">
        <div className="card">
          <div className="card-body">
            <h1 style={{ marginTop: 0 }}>新增物件</h1>
            <p className="muted">先建立草稿物件；圖片、SEO、上架與完整內容會在後續階段補上。</p>
            <DraftPropertyForm action={createDraftPropertyAction} initialState={initialDraftPropertyFormState} />
            <div className="actions">
              <Link className="button ghost" href="/admin/properties">返回物件列表</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
