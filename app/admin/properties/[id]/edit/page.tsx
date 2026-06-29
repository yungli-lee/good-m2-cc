import { notFound } from "next/navigation";
import Link from "next/link";
import { PropertyForm } from "@/components/admin/property-form";
import { requireRole } from "@/lib/auth";
import { getAdminPropertyById } from "@/lib/properties/queries";
import type { Property } from "@/lib/properties/types";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function EditPropertyPage({ params, searchParams }: Props) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const { id } = await params;
  const query = await searchParams;
  const { data, error } = await getAdminPropertyById(id);
  if (error || !data) notFound();

  const property = data as Property;

  return (
    <main className="section">
      <div className="container">
        <h1>編輯物件</h1>
        <p className="muted">M2-001：本階段只編輯案名、Slug、開價與公開地址。目前狀態：{property.status}</p>
        {query.saved ? <div className="notice">已儲存。</div> : null}
        {query.error ? <div className="notice">操作失敗：{query.error}</div> : null}
        <div className="card">
          <div className="card-body">
            <PropertyForm key={property.id} property={property} role={current.profile.role} formAction={`/admin/properties/${property.id}/edit/save`} />
            <div className="actions">
              <Link className="button ghost" href="/admin/properties">返回物件列表</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
