import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { listAdminProperties } from "@/lib/properties/queries";
import type { PropertyStatus } from "@/lib/properties/types";
import { togglePropertyFeaturedAction, togglePropertyPublishAction } from "./actions";

export const runtime = "edge";

type AdminPropertyListItem = {
  id: string;
  title: string;
  slug: string;
  address_public: string | null;
  price: number | null;
  status: PropertyStatus;
  is_featured: boolean;
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

type Props = {
  searchParams: Promise<{ error?: string }>;
};

function PublishAction({ id, status }: { id: string; status: PropertyStatus }) {
  if (status === "draft") {
    return (
      <form action={togglePropertyPublishAction.bind(null, id, "published")}>
        <button className="button" type="submit">發布</button>
      </form>
    );
  }

  if (status === "published") {
    return (
      <form action={togglePropertyPublishAction.bind(null, id, "draft")}>
        <button className="button ghost" type="submit">下架回草稿</button>
      </form>
    );
  }

  return <span className="muted">暫無操作</span>;
}

function FeaturedAction({ id, isFeatured }: { id: string; isFeatured: boolean }) {
  return (
    <form action={togglePropertyFeaturedAction.bind(null, id, !isFeatured)}>
      <button className={isFeatured ? "button ghost" : "button"} type="submit">
        {isFeatured ? "取消精選" : "設為精選"}
      </button>
    </form>
  );
}

const errorMessage: Record<string, string> = {
  not_found: "找不到指定物件。",
  publish_failed: "物件狀態更新失敗，請稍後再試。",
  featured_failed: "精選狀態更新失敗，請稍後再試。"
};

export default async function AdminPropertiesPage({ searchParams }: Props) {
  await requireRole(["editor", "admin", "owner"]);
  const query = await searchParams;
  const { data, error } = await listAdminProperties();
  const properties = (data || []) as AdminPropertyListItem[];

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>物件管理</h1>
            <p className="muted">M2-003：可從列表管理發布狀態與精選物件標記。</p>
          </div>
          <div className="actions">
            <Link className="button ghost" href="/admin">返回後台</Link>
            <Link className="button" href="/admin/properties/new">新增物件</Link>
          </div>
        </div>
        {error ? <div className="notice">物件資料讀取失敗。</div> : null}
        {query.error ? <div className="notice">{errorMessage[query.error] || `操作失敗：${query.error}`}</div> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>案名</th>
                <th>縣市</th>
                <th>行政區</th>
                <th>開價</th>
                <th>狀態</th>
                <th>精選</th>
                <th>更新時間</th>
                <th>操作</th>
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
                    <td>{property.is_featured ? "精選" : "-"}</td>
                    <td>{formatDateTime(property.updated_at)}</td>
                    <td>
                      <div className="actions">
                        <Link className="button ghost" href={`/admin/properties/${property.id}/edit`}>編輯</Link>
                        <PublishAction id={property.id} status={property.status} />
                        <FeaturedAction id={property.id} isFeatured={property.is_featured} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={8}>尚未建立物件。可以先使用「新增物件」建立草稿。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
