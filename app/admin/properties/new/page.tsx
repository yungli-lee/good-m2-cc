import Link from "next/link";
import { AiPropertyForm } from "@/components/admin/ai-property-form";
import { requireRole } from "@/lib/auth";
import { createPropertyAction } from "../actions";

export const runtime = "edge";

export default async function NewPropertyPage() {
  const current = await requireRole(["editor", "admin", "owner"]);

  return (
    <main className="section">
      <div className="container">
        <div className="card">
          <div className="card-body">
            <h1 style={{ marginTop: 0 }}>新增物件</h1>
            <p className="muted">貼上一段物件資料後按 AI 解析，系統會先完成主要欄位，送出前仍可人工調整。</p>
            <AiPropertyForm role={current.profile.role} formAction={createPropertyAction} />
            <div className="actions">
              <Link className="button ghost" href="/admin/properties">返回物件列表</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
