import Link from "next/link";
import { canDeleteProperties, canPublishProperties, requireRole } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { calculatePropertyHealthScore } from "@/lib/properties/health-score";
import { listAdminProperties } from "@/lib/properties/queries";
import type { AdminPropertyLifecycleFilter } from "@/lib/properties/queries";
import { unpublishReasons } from "@/lib/properties/lifecycle";
import type { PropertyMedia, PropertyStatus } from "@/lib/properties/types";
import {
  permanentDeletePropertyAction,
  republishPropertyAction,
  restorePropertyAction,
  softDeletePropertyAction,
  togglePropertyFeaturedAction,
  togglePropertyPublishAction,
  unpublishPropertyAction
} from "./actions";

export const runtime = "edge";

type AdminPropertyListItem = {
  id: string;
  title: string;
  slug: string;
  address_public: string | null;
  listing_no: string | null;
  listing_type: string | null;
  listing_start_date: string | null;
  listing_end_date: string | null;
  developer_names: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  address_private: string | null;
  showing_instructions: string | null;
  price: number | null;
  land_area_ping: number | null;
  building_area_ping: number | null;
  layout: string | null;
  age: number | null;
  orientation: string | null;
  floor: string | null;
  property_type: string;
  highlights: string[];
  description: string | null;
  status: PropertyStatus;
  expired_at: string | null;
  is_featured: boolean;
  seo_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  published_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  delete_reason: string | null;
  property_media?: PropertyMedia[];
};

const statusLabel: Record<PropertyStatus, string> = {
  draft: "草稿",
  published: "已上架",
  archived: "下架",
  expired: "委託到期"
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
  searchParams: Promise<{ error?: string; q?: string; lifecycle?: string }>;
};

const lifecycleFilters: Array<{ value: AdminPropertyLifecycleFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "published", label: "已上架" },
  { value: "archived", label: "已下架" },
  { value: "expired", label: "委託到期" },
  { value: "draft", label: "草稿" },
  { value: "deleted", label: "已刪除" }
];

function filterHref(filter: AdminPropertyLifecycleFilter, search: string) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (filter !== "all") params.set("lifecycle", filter);
  return `/admin/properties${params.toString() ? `?${params.toString()}` : ""}`;
}

function PublishAction({ id, status, canPublish, deleted }: { id: string; status: PropertyStatus; canPublish: boolean; deleted: boolean }) {
  if (!canPublish || deleted) return null;
  if (status === "draft") {
    return (
      <form action={togglePropertyPublishAction.bind(null, id, "published")}>
        <button className="button" type="submit">發布</button>
      </form>
    );
  }

  if (status === "published") {
    return (
      <details className="property-lifecycle-action">
        <summary className="button ghost">下架</summary>
        <form className="property-lifecycle-form" action={unpublishPropertyAction.bind(null, id)}>
          <p className="muted">下架需填寫原因，紀錄會寫入時間軸。</p>
          <label className="field">
            <span>下架原因</span>
            <select className="select" name="unpublish_reason" defaultValue="成交" required>
              {unpublishReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </select>
          </label>
          <label className="field">
            <span>其他原因</span>
            <input className="input" name="unpublish_reason_other" placeholder="選其他時填寫" />
          </label>
          <button className="button danger" type="submit">確認下架</button>
        </form>
      </details>
    );
  }

  return (
    <form action={republishPropertyAction.bind(null, id)}>
      <button className="button" type="submit">重新上架</button>
    </form>
  );
}

function FeaturedAction({ id, isFeatured, deleted }: { id: string; isFeatured: boolean; deleted: boolean }) {
  if (deleted) return null;
  return (
    <form action={togglePropertyFeaturedAction.bind(null, id, !isFeatured)}>
      <button className={isFeatured ? "button ghost" : "button"} type="submit">
        {isFeatured ? "取消精選" : "設為精選"}
      </button>
    </form>
  );
}

function DeleteAction({ id, deleted, canDelete }: { id: string; deleted: boolean; canDelete: boolean }) {
  if (!canDelete) return null;
  if (deleted) {
    return (
      <>
        <form action={restorePropertyAction.bind(null, id)}>
          <button className="button" type="submit">還原</button>
        </form>
        <details className="property-lifecycle-action">
          <summary className="button danger">永久刪除</summary>
          <form className="property-lifecycle-form" action={permanentDeletePropertyAction.bind(null, id)}>
            <p className="notice">此動作不可復原。</p>
            <button className="button danger" type="submit">確認永久刪除</button>
          </form>
        </details>
      </>
    );
  }

  return (
    <details className="property-lifecycle-action">
      <summary className="button danger">刪除</summary>
      <form className="property-lifecycle-form" action={softDeletePropertyAction.bind(null, id)}>
        <p className="notice">確定要刪除此物件？刪除後不會出現在前台，但仍可於後台查看及還原。</p>
        <label className="field">
          <span>刪除原因</span>
          <input className="input" name="delete_reason" placeholder="可留空" />
        </label>
        <button className="button danger" type="submit">確認刪除</button>
      </form>
    </details>
  );
}

function HealthScoreCell({ property }: { property: AdminPropertyListItem }) {
  const health = calculatePropertyHealthScore(property);
  const missing = health.missing.slice(0, 3).map((item) => item.label).join("、");

  return (
    <div className="property-health">
      <span className={`property-health-badge is-${health.level}`}>{health.score}</span>
      <div>
        <strong>{health.label}</strong>
        <br />
        <span className="muted">{missing ? `待補：${missing}` : "資料完整度良好"}</span>
      </div>
    </div>
  );
}

const errorMessage: Record<string, string> = {
  not_found: "找不到指定物件。",
  publish_failed: "物件狀態更新失敗，請稍後再試。",
  featured_failed: "精選狀態更新失敗，請稍後再試。",
  unpublish_reason_required: "請選擇下架原因；選「其他」時請填寫原因。",
  unpublish_failed: "下架失敗，請稍後再試。",
  not_published: "此物件目前不是已上架狀態。",
  already_published: "此物件已經是上架狀態。",
  republish_failed: "重新上架失敗，請稍後再試。",
  delete_failed: "刪除失敗，請稍後再試。",
  restore_failed: "還原失敗，請稍後再試。",
  permanent_delete_failed: "永久刪除失敗，請稍後再試。"
};

export default async function AdminPropertiesPage({ searchParams }: Props) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const query = await searchParams;
  const search = query.q?.trim() || "";
  const lifecycle = lifecycleFilters.some((item) => item.value === query.lifecycle)
    ? query.lifecycle as AdminPropertyLifecycleFilter
    : "all";
  const { data, error } = await listAdminProperties(search, lifecycle);
  const properties = (data || []) as AdminPropertyListItem[];
  const canPublish = canPublishProperties(current.profile.role);
  const canDelete = canDeleteProperties(current.profile.role);

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>物件管理</h1>
            <p className="muted">B-001：列表顯示物件健康度，協助優先補齊可上架資料。</p>
          </div>
          <div className="actions">
            <Link className="button ghost" href="/admin">返回後台</Link>
            <Link className="button" href="/admin/properties/new">新增物件</Link>
          </div>
        </div>
        {error ? <div className="notice">物件資料讀取失敗。</div> : null}
        {query.error ? <div className="notice">{errorMessage[query.error] || `操作失敗：${query.error}`}</div> : null}
        <form className="actions" style={{ marginBottom: 12 }} action="/admin/properties">
          <input className="input" name="q" placeholder="搜尋案名、Slug、委託書編號、屋主名稱" defaultValue={search} />
          <input type="hidden" name="lifecycle" value={lifecycle === "all" ? "" : lifecycle} />
          <button className="button ghost" type="submit">搜尋</button>
          {search ? <Link className="button ghost" href="/admin/properties">清除</Link> : null}
        </form>
        <div className="actions" style={{ marginBottom: 12 }}>
          {lifecycleFilters.map((filter) => (
            <Link
              key={filter.value}
              className={filter.value === lifecycle ? "button" : "button ghost"}
              href={filterHref(filter.value, search)}
            >
              {filter.value === lifecycle ? "☑" : "□"} {filter.label}
            </Link>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>案名</th>
                <th>委託書編號</th>
                <th>開發人員</th>
                <th>縣市</th>
                <th>行政區</th>
                <th>開價</th>
                <th>健康度</th>
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
                      {property.deleted_at ? (
                        <>
                          <br />
                          <span className="muted">已刪除：{formatDateTime(property.deleted_at)}</span>
                        </>
                      ) : null}
                    </td>
                    <td>{property.listing_no || "-"}</td>
                    <td>{property.developer_names || "-"}</td>
                    <td>{location.city}</td>
                    <td>{location.district}</td>
                    <td>{formatPrice(property.price)}</td>
                    <td><HealthScoreCell property={property} /></td>
                    <td>
                      {property.deleted_at ? "已刪除" : statusLabel[property.status]}
                      {property.status === "published" ? (
                        <>
                          <br />
                          <span className="muted">{formatDateTime(property.published_at)}</span>
                        </>
                      ) : null}
                      {property.status === "expired" ? (
                        <>
                          <br />
                          <span className="muted">{formatDateTime(property.expired_at)}</span>
                        </>
                      ) : null}
                    </td>
                    <td>{property.is_featured ? "精選" : "-"}</td>
                    <td>{formatDateTime(property.updated_at)}</td>
                    <td>
                      <div className="actions">
                        <Link className="button ghost" href={`/admin/properties/${property.id}/edit`}>編輯</Link>
                        {!property.deleted_at ? <Link className="button ghost" href={`/admin/properties/${property.id}/export`}>匯出 Excel</Link> : null}
                        <PublishAction id={property.id} status={property.status} canPublish={canPublish} deleted={Boolean(property.deleted_at)} />
                        {canPublish ? <FeaturedAction id={property.id} isFeatured={property.is_featured} deleted={Boolean(property.deleted_at)} /> : null}
                        <DeleteAction id={property.id} deleted={Boolean(property.deleted_at)} canDelete={canDelete} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={11}>尚未建立物件。可以先使用「新增物件」建立草稿。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
