import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/admin/property-form";
import { PropertyMediaManager } from "@/components/admin/property-media-manager";
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
        <p className="muted">目前狀態：{property.status}</p>
        {query.saved ? <div className="notice">已儲存。</div> : null}
        {query.error ? <div className="notice">操作失敗：{query.error}</div> : null}
        <div className="card">
          <div className="card-body">
            <PropertyForm
              property={property}
              role={current.profile.role}
              formAction={`/admin/properties/${property.id}/edit/save`}
            />
          </div>
        </div>
        <PropertyMediaManager
          media={(property.property_media || []).filter((item) => !item.deleted_at)}
          uploadAction={`/admin/properties/${property.id}/edit/upload`}
          setCoverAction={`/admin/properties/${property.id}/edit/cover`}
        />
      </div>
    </main>
  );
}
