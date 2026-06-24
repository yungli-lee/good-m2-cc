import Link from "next/link";
import { deletePropertyAction, publishPropertyAction } from "./actions";
import { canDeleteProperties, canPublishProperties, requireRole } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { listAdminProperties } from "@/lib/properties/queries";
import type { Property } from "@/lib/properties/types";

export const runtime = "edge";

const statusLabel: Record<string, string> = {
  draft: "草稿",
  published: "已上架",
  archived: "下架"
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminPropertiesPage({ searchParams }: Props) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const params = await searchParams;
  const { data, error } = await listAdminProperties();
  const properties = (data || []) as Property[];
  const canPublish = canPublishProperties(current.profile.role);
  const canDelete = canDeleteProperties(current.profile.role);

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>物件管理</h1>
            <p className="muted">editor 可新增與編輯草稿；admin / owner 才可上架、下架與軟刪除。</p>
          </div>
          <Link className="button" href="/admin/properties/new">新增物件</Link>
        </div>
        {params.error ? <div className="notice">操作失敗：{params.error}</div> : null}
        {error ? <div className="notice">物件資料讀取失敗。</div> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>案名</th>
                <th>狀態</th>
                <th>開價</th>
                <th>更新時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id}>
                  <td>
                    <strong>{property.title}</strong>
                    <br />
                    <span className="muted">/{property.slug}</span>
                  </td>
                  <td>{statusLabel[property.status]}</td>
                  <td>{formatPrice(property.price)}</td>
                  <td>{formatDateTime(property.updated_at)}</td>
                  <td>
                    <div className="actions">
                      <Link className="button ghost" href={`/admin/properties/${property.id}/edit`}>編輯</Link>
                      {property.status === "published" ? (
                        <Link className="button ghost" href={`/properties/${property.slug}`}>前台</Link>
                      ) : null}
                      {canPublish && property.status !== "published" ? (
                        <form action={publishPropertyAction.bind(null, property.id, "published")}>
                          <button className="button secondary" type="submit">上架</button>
                        </form>
                      ) : null}
                      {canPublish && property.status === "published" ? (
                        <form action={publishPropertyAction.bind(null, property.id, "archived")}>
                          <button className="button ghost" type="submit">下架</button>
                        </form>
                      ) : null}
                      {canDelete ? (
                        <form action={deletePropertyAction.bind(null, property.id)}>
                          <button className="button danger" type="submit">軟刪除</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={5}>尚未建立物件。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
