"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  mediaCategoryValues,
  mediaSortValues,
  mediaUsageTypes
} from "@/lib/media";
import type { MediaCategoryFilter, MediaLibraryAsset, MediaSort, MediaStatus, MediaUsageType } from "@/lib/media";

type Props = {
  assets: MediaLibraryAsset[];
  filters: {
    q: string;
    usage: MediaCategoryFilter;
    status: MediaStatus;
    sort: MediaSort;
  };
};

const usageTypeLabels: Record<MediaUsageType, string> = {
  knowledge_hero: "Knowledge Hero",
  knowledge_inline: "Knowledge Inline",
  knowledge_gallery: "Knowledge Gallery",
  property_image: "Property Image",
  property_cover: "Property Cover",
  property_floor_plan: "Property Floor Plan",
  property_document_image: "Property Document Image",
  company_logo: "Company Logo",
  company_line_qr: "Company LINE QR",
  hero_banner: "Hero Banner",
  general: "General"
};

const categoryLabels: Record<MediaCategoryFilter, string> = {
  all: "全部",
  knowledge: "Knowledge",
  property: "Property",
  company: "Company",
  hero: "Hero",
  general: "General"
};

const sortLabels: Record<MediaSort, string> = {
  newest: "最新",
  oldest: "最舊",
  name: "名稱"
};

const statusLabels: Record<MediaStatus, string> = {
  active: "Active",
  deleted: "Deleted"
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatBytes(value?: number | null) {
  if (!value && value !== 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function dimensions(asset: MediaLibraryAsset) {
  if (!asset.width || !asset.height) return "-";
  return `${asset.width} x ${asset.height}`;
}

function queryHref(filters: Props["filters"], patch: Partial<Props["filters"]>) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.usage !== "all") params.set("usage", next.usage);
  if (next.status !== "active") params.set("status", next.status);
  if (next.sort !== "newest") params.set("sort", next.sort);
  return `/admin/media${params.toString() ? `?${params.toString()}` : ""}`;
}

export function MediaLibraryManager({ assets, filters }: Props) {
  const router = useRouter();
  const uploadDialogRef = useRef<HTMLDialogElement>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<MediaLibraryAsset | null>(assets[0] || null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedAsset = useMemo(() => {
    if (!selected) return assets[0] || null;
    return assets.find((asset) => asset.id === selected.id) || selected;
  }, [assets, selected]);

  function refreshWithMessage(nextMessage: string) {
    setMessage(nextMessage);
    setError(null);
    router.refresh();
  }

  function handleUpload(formData: FormData) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || "上傳失敗。");
        return;
      }
      uploadDialogRef.current?.close();
      refreshWithMessage("媒體已上傳。");
    });
  }

  function handleEdit(formData: FormData) {
    if (!selectedAsset) return;
    setError(null);
    setMessage(null);
    const payload = {
      alt_text: String(formData.get("alt_text") || ""),
      caption: String(formData.get("caption") || ""),
      usage_type: String(formData.get("usage_type") || "general")
    };
    startTransition(async () => {
      const response = await fetch(`/api/admin/media/${selectedAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "更新失敗。");
        return;
      }
      editDialogRef.current?.close();
      refreshWithMessage("媒體資料已更新。");
    });
  }

  function handleDelete() {
    if (!selectedAsset || !window.confirm("確認刪除此媒體？")) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/media/${selectedAsset.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "刪除失敗。");
        return;
      }
      setSelected(null);
      refreshWithMessage("媒體已刪除。");
    });
  }

  return (
    <div className="media-library">
      {message ? <div className="success">{message}</div> : null}
      {error ? <div className="notice">{error}</div> : null}

      <form className="media-library-toolbar" action="/admin/media">
        <label className="field">
          <span>搜尋</span>
          <input className="input" name="q" defaultValue={filters.q} placeholder="檔名、ALT、Caption、Usage Type" />
        </label>
        <label className="field">
          <span>Usage</span>
          <select className="select" name="usage" defaultValue={filters.usage}>
            {mediaCategoryValues.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select className="select" name="status" defaultValue={filters.status}>
            <option value="active">{statusLabels.active}</option>
            <option value="deleted">{statusLabels.deleted}</option>
          </select>
        </label>
        <label className="field">
          <span>排序</span>
          <select className="select" name="sort" defaultValue={filters.sort}>
            {mediaSortValues.map((value) => <option key={value} value={value}>{sortLabels[value]}</option>)}
          </select>
        </label>
        <div className="media-library-toolbar-actions">
          <button className="button ghost" type="submit">套用</button>
          <Link className="button ghost" href="/admin/media">清除</Link>
          <button className="button" type="button" onClick={() => uploadDialogRef.current?.showModal()}>上傳</button>
        </div>
      </form>

      <div className="admin-filter-tabs" aria-label="媒體分類">
        {mediaCategoryValues.map((value) => (
          <Link key={value} className={filters.usage === value ? "button" : "button ghost"} href={queryHref(filters, { usage: value })}>
            {categoryLabels[value]}
          </Link>
        ))}
      </div>

      <div className="media-library-layout">
        <div className="media-library-grid" aria-label="媒體清單">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className={`media-library-card${selectedAsset?.id === asset.id ? " is-selected" : ""}`}
              onClick={() => setSelected(asset)}
            >
              <img src={asset.public_url} alt={asset.alt_text || asset.original_filename || "媒體圖片"} loading="lazy" />
              <span className="media-library-card-body">
                <strong>{asset.original_filename || asset.id}</strong>
                <span>{asset.mime_type}</span>
                <span>{dimensions(asset)} · {formatBytes(asset.file_size)}</span>
                <span>{formatDate(asset.created_at)}</span>
              </span>
            </button>
          ))}
          {!assets.length ? <div className="media-library-empty">沒有符合條件的媒體。</div> : null}
        </div>

        <aside className="media-library-detail" aria-label="媒體詳細資料">
          {selectedAsset ? (
            <>
              <img className="media-library-preview" src={selectedAsset.public_url} alt={selectedAsset.alt_text || selectedAsset.original_filename || "媒體預覽"} />
              <div className="media-library-detail-header">
                <h2>{selectedAsset.original_filename || selectedAsset.id}</h2>
                <div className="actions">
                  {selectedAsset.status === "active" ? <button className="button ghost" type="button" onClick={() => editDialogRef.current?.showModal()}>編輯</button> : null}
                  {selectedAsset.status === "active" ? <button className="button danger" type="button" onClick={handleDelete} disabled={pending}>刪除</button> : null}
                </div>
              </div>
              <dl className="media-library-meta">
                <div><dt>Bucket</dt><dd>{selectedAsset.bucket}</dd></div>
                <div><dt>Storage Path</dt><dd>{selectedAsset.storage_path}</dd></div>
                <div><dt>ALT</dt><dd>{selectedAsset.alt_text || "-"}</dd></div>
                <div><dt>Caption</dt><dd>{selectedAsset.caption || "-"}</dd></div>
                <div><dt>Usage Type</dt><dd>{usageTypeLabels[selectedAsset.usage_type]}</dd></div>
                <div><dt>MIME</dt><dd>{selectedAsset.mime_type}</dd></div>
                <div><dt>尺寸</dt><dd>{dimensions(selectedAsset)}</dd></div>
                <div><dt>檔案大小</dt><dd>{formatBytes(selectedAsset.file_size)}</dd></div>
                <div><dt>Created By</dt><dd>{selectedAsset.created_by_label || "-"}</dd></div>
                <div><dt>Created At</dt><dd>{formatDate(selectedAsset.created_at)}</dd></div>
                <div><dt>是否被引用</dt><dd>{selectedAsset.references.length ? "是" : "否"}</dd></div>
              </dl>
              {selectedAsset.references.length ? (
                <div className="media-library-references">
                  <h3>引用</h3>
                  <ul>
                    {selectedAsset.references.map((reference, index) => (
                      <li key={`${reference.type}-${reference.label}-${index}`}>
                        <strong>{reference.type}</strong>
                        <span>{reference.label}</span>
                        <em>{reference.role}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <div className="media-library-empty">請選擇媒體。</div>
          )}
        </aside>
      </div>

      <dialog className="admin-dialog" ref={uploadDialogRef}>
        <form className="form-grid" action={handleUpload}>
          <div className="field full">
            <h2>上傳媒體</h2>
          </div>
          <label className="field full">
            <span>圖片</span>
            <input className="input" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required />
          </label>
          <label className="field">
            <span>Usage Type</span>
            <select className="select" name="usage_type" defaultValue="general">
              {mediaUsageTypes.map((value) => <option key={value} value={value}>{usageTypeLabels[value]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>ALT</span>
            <input className="input" name="alt_text" maxLength={300} />
          </label>
          <label className="field full">
            <span>Caption</span>
            <textarea className="textarea" name="caption" maxLength={500} />
          </label>
          <div className="actions field full">
            <button className="button" type="submit" disabled={pending}>{pending ? "上傳中..." : "上傳"}</button>
            <button className="button ghost" type="button" onClick={() => uploadDialogRef.current?.close()}>取消</button>
          </div>
        </form>
      </dialog>

      <dialog className="admin-dialog" ref={editDialogRef}>
        {selectedAsset ? (
          <form className="form-grid" action={handleEdit}>
            <div className="field full">
              <h2>編輯媒體</h2>
            </div>
            <label className="field">
              <span>Usage Type</span>
              <select className="select" name="usage_type" defaultValue={selectedAsset.usage_type}>
                {mediaUsageTypes.map((value) => <option key={value} value={value}>{usageTypeLabels[value]}</option>)}
              </select>
            </label>
            <label className="field">
              <span>ALT</span>
              <input className="input" name="alt_text" maxLength={300} defaultValue={selectedAsset.alt_text || ""} />
            </label>
            <label className="field full">
              <span>Caption</span>
              <textarea className="textarea" name="caption" maxLength={500} defaultValue={selectedAsset.caption || ""} />
            </label>
            <div className="actions field full">
              <button className="button" type="submit" disabled={pending}>{pending ? "儲存中..." : "儲存"}</button>
              <button className="button ghost" type="button" onClick={() => editDialogRef.current?.close()}>取消</button>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
