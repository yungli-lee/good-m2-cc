import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { listAdminProperties } from "@/lib/properties/queries";
import type { PropertyStatus } from "@/lib/properties/types";

export const runtime = "edge";

type AdminPropertyListItem = {
  id: string;
  title: string;
  slug: string;
  address_public: string | null;
  price: number | null;
  status: PropertyStatus;
  published_at: string | null;
  updated_at: string | null;
};

const statusLabel: Record<PropertyStatus, string> = {
  draft: "草稿",
  published: "已上架",
  archived: "下架"
};

const cityPattern = /^(?<city>[^縣市]+[縣市])(?<district>[^鄉鎮市區]+[鄉鎮市區])?/;

function parsePublicLocation(address?: string | null) {
  const match = address?.match(cityPattern);
  return {
    city: match?.groups?.city || "-",
    district: match?.groups?.district || "-"
  };
}

export default async function AdminPropertiesPage() {
  await requireRole(["editor", "admin", "owner"]);
  const { data, error } = await listAdminProperties();
  const properties = (data || []) as AdminPropertyListItem[];

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>物件管理</h1>
            <p className="muted">A-012 Phase 1：先提供後台物件列表；新增、編輯、上下架與刪除會在後續階段處理。</p>
          </div>
          <div className="actions">
            <Link className="button ghost" href="/admin">返回後台</Link>
            <Link className="button" href="/admin/properties/new">新增物件</Link>
          </div>
        </div>
        {error ? <div className="notice">物件資料讀取失敗。</div> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>案名</th>
                <th>縣市</th>
                <th>行政區</th>
                <th>開價</th>
                <th>狀態</th>
                <th>更新時間</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => {
                const location = parsePublicLocation(property.address_public);
                return (
                  <tr key={property.id}>
                    <td>
                      <strong>{property.title}</strong>
                      <br />
                      <span className="muted">/{property.slug}</span>
                    </td>
                    <td>{location.city}</td>
                    <td>{location.district}</td>
                    <td>{formatPrice(property.price)}</td>
                    <td>
                      {statusLabel[property.status]}
                      {property.status === "published" ? (
                        <>
                          <br />
                          <span className="muted">{formatDateTime(property.published_at)}</span>
                        </>
                      ) : null}
                    </td>
                    <td>{formatDateTime(property.updated_at)}</td>
                  </tr>
                );
              })}
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={6}>尚未建立物件。可以先使用「新增物件」建立草稿。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
