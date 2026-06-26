import Link from "next/link";
import { requireRole } from "@/lib/auth";

export const runtime = "edge";

export default async function NewPropertyPage() {
  await requireRole(["editor", "admin", "owner"]);

  return (
    <main className="section">
      <div className="container">
        <div className="card">
          <div className="card-body">
            <h1 style={{ marginTop: 0 }}>新增物件</h1>
            <p className="muted">A-012 Phase 1 先建立物件列表；新增表單會在後續 CRUD 階段補上。</p>
            <div className="actions">
              <Link className="button ghost" href="/admin/properties">返回物件列表</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
