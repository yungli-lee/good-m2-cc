import { PropertyForm } from "@/components/admin/property-form";
import { requireRole } from "@/lib/auth";
import { createPropertyAction } from "../actions";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewPropertyPage({ searchParams }: Props) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const params = await searchParams;

  return (
    <main className="section">
      <div className="container">
        <h1>新增物件</h1>
        <p className="muted">editor 新增時一律建立為草稿。</p>
        {params.error ? <div className="notice">建立失敗：{params.error}</div> : null}
        <div className="card">
          <div className="card-body">
            <PropertyForm role={current.profile.role} formAction={createPropertyAction} />
          </div>
        </div>
      </div>
    </main>
  );
}
