"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  mediaCategoryLabels,
  mediaCategoryValues,
  mediaSortLabels,
  mediaSortValues,
  mediaStatusLabels,
  mediaUsageTypeLabels,
  mediaUsageTypes
} from "@/lib/media";
import { formatTaipeiDateTime } from "@/lib/format";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visibleAssets, setVisibleAssets] = useState<MediaLibraryAsset[]>(assets);
  const [selected, setSelected] = useState<MediaLibraryAsset | null>(assets[0] || null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setVisibleAssets(assets);
    setSelected((current) => {
      if (!current) return assets[0] || null;
      return assets.find((asset) => asset.id === current.id) || assets[0] || null;
    });
  }, [assets]);

  const selectedAsset = useMemo(() => {
    if (!selected) return visibleAssets[0] || null;
    return visibleAssets.find((asset) => asset.id === selected.id) || selected;
  }, [selected, visibleAssets]);

  function refreshWithMessage(nextMessage: string) {
    setMessage(nextMessage);
    setError(null);
    router.refresh();
  }

  function handleUpload(formData: FormData) {
    setError(null);
    setMessage(null);
    if (uploadFile) formData.set("file", uploadFile);
    startTransition(async () => {
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || "上傳失敗。");
        return;
      }
      const nextAsset = payload?.data as MediaLibraryAsset | undefined;
      if (nextAsset) {
        setVisibleAssets((current) => [nextAsset, ...current.filter((asset) => asset.id !== nextAsset.id)]);
        setSelected(nextAsset);
      }
      uploadDialogRef.current?.close();
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refreshWithMessage("媒體已上傳。");
    });
  }

  function handleUploadDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingUpload(false);
    const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/") || item.type.startsWith("video/"));
    if (!file) {
      setError("請拖放圖片或影片檔案。");
      return;
    }
    setUploadFile(file);
    setError(null);
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
      const nextAsset = result?.data as MediaLibraryAsset | undefined;
      if (nextAsset) {
        setVisibleAssets((current) => current.map((asset) => asset.id === nextAsset.id ? { ...asset, ...nextAsset } : asset));
        setSelected((current) => current?.id === nextAsset.id ? { ...current, ...nextAsset } : current);
      }
      editDialogRef.current?.close();
      refreshWithMessage("媒體資料已更新。");
    });
  }

  function handleArchive() {
    if (!selectedAsset || !window.confirm("確認封存此媒體？")) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/media/${selectedAsset.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "封存失敗。");
        return;
      }
      setVisibleAssets((current) => current.filter((asset) => asset.id !== selectedAsset.id));
      setSelected(null);
      refreshWithMessage("媒體已封存。");
    });
  }

  function handleRestore() {
    if (!selectedAsset) return;
    setError(null);
    setMessage(null);
    const payload = {
      alt_text: selectedAsset.alt_text || "",
      caption: selectedAsset.caption || "",
      usage_type: selectedAsset.usage_type,
      status: "active"
    };
    startTransition(async () => {
      const response = await fetch(`/api/admin/media/${selectedAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "解除封存失敗。");
        return;
      }
      const nextAsset = result?.data as MediaLibraryAsset | undefined;
      if (nextAsset) {
        setVisibleAssets((current) => current.map((asset) => asset.id === nextAsset.id ? { ...asset, ...nextAsset } : asset));
        setSelected((current) => current?.id === nextAsset.id ? { ...current, ...nextAsset } : current);
      }
      refreshWithMessage("媒體已解除封存。");
    });
  }

  function copySelectedUrl() {
    if (!selectedAsset) return;
    navigator.clipboard.writeText(selectedAsset.public_url)
      .then(() => refreshWithMessage("圖片 URL 已複製。"))
      .catch(() => setError("複製失敗，請手動選取圖片 URL。"));
  }

  function openUploadDialog() {
    setUploadFile(null);
    setIsDraggingUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    uploadDialogRef.current?.showModal();
  }

  function closeUploadDialog() {
    setUploadFile(null);
    setIsDraggingUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    uploadDialogRef.current?.close();
  }

  function mediaOptionLabel(value: MediaUsageType) {
    return mediaUsageTypeLabels[value];
  }

  function statusBadge(status: MediaStatus) {
    return status === "active" ? "啟用" : "封存";
  }

  function selectedUrlInputId(id: string) {
    return `media-url-${id}`;
  }

  function mediaName(asset: MediaLibraryAsset) {
    return asset.original_filename || asset.alt_text || asset.id;
  }

  function detailValue(value?: string | null) {
    return value || "-";
  }

  function createdByLabel(asset: MediaLibraryAsset) {
    return asset.created_by_label || "-";
  }

  function assetStatusClass(asset: MediaLibraryAsset) {
    return asset.status === "active" ? "admin-users-badge is-active" : "admin-users-badge is-disabled";
  }

  function emptyMessage() {
    return filters.status === "deleted" ? "目前沒有封存媒體。" : "沒有符合條件的媒體。";
  }

  function shouldShowArchive(asset: MediaLibraryAsset) {
    return asset.status === "active";
  }

  function shouldShowRestore(asset: MediaLibraryAsset) {
    return asset.status === "deleted" && asset.media_type === "image";
  }

  function detailTitle(asset: MediaLibraryAsset) {
    return mediaName(asset);
  }

  function usageText(asset: MediaLibraryAsset) {
    return mediaUsageTypeLabels[asset.usage_type] || asset.usage_type;
  }

  function statusText(asset: MediaLibraryAsset) {
    return mediaStatusLabels[asset.status] || asset.status;
  }

  function categoryText(value: MediaCategoryFilter) {
    return mediaCategoryLabels[value];
  }

  function sortText(value: MediaSort) {
    return mediaSortLabels[value];
  }

  return (
    <div className="media-library">
      {message ? <div className="success">{message}</div> : null}
      {error ? <div className="notice">{error}</div> : null}

      <form className="media-library-toolbar" action="/admin/media">
        <label className="field">
          <span>搜尋</span>
          <input className="input" name="q" defaultValue={filters.q} placeholder="檔名、替代文字、圖片說明、用途類型" />
        </label>
        <label className="field">
          <span>用途類型</span>
          <select className="select" name="usage" defaultValue={filters.usage}>
            {mediaCategoryValues.map((value) => <option key={value} value={value}>{categoryText(value)}</option>)}
          </select>
        </label>
        <label className="field">
          <span>狀態</span>
          <select className="select" name="status" defaultValue={filters.status}>
            <option value="active">{mediaStatusLabels.active}</option>
            <option value="deleted">{mediaStatusLabels.deleted}</option>
          </select>
        </label>
        <label className="field">
          <span>排序</span>
          <select className="select" name="sort" defaultValue={filters.sort}>
            {mediaSortValues.map((value) => <option key={value} value={value}>{sortText(value)}</option>)}
          </select>
        </label>
        <div className="media-library-toolbar-actions">
          <button className="button ghost" type="submit">套用</button>
          <Link className="button ghost" href="/admin/media">清除</Link>
          <button className="button" type="button" onClick={openUploadDialog}>上傳</button>
        </div>
      </form>

      <div className="admin-filter-tabs" aria-label="媒體分類">
        {mediaCategoryValues.map((value) => (
          <Link key={value} className={filters.usage === value ? "button" : "button ghost"} href={queryHref(filters, { usage: value })}>
            {categoryText(value)}
          </Link>
        ))}
      </div>

      <div className="media-library-layout">
        <div className="media-library-grid" aria-label="媒體清單">
          {visibleAssets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className={`media-library-card${selectedAsset?.id === asset.id ? " is-selected" : ""}`}
              onClick={() => setSelected(asset)}
            >
              {asset.media_type === "video"
                ? asset.poster_url
                  ? <img src={asset.poster_url} alt={asset.alt_text || asset.original_filename || "影片 Poster"} loading="lazy" />
                  : <span className="property-video-fallback">影片無法播放</span>
                : <img src={asset.public_url} alt={asset.alt_text || asset.original_filename || "媒體圖片"} loading="lazy" />}
              <span className="media-library-card-body">
                <strong>{mediaName(asset)}</strong>
                <span>{usageText(asset)} · {statusBadge(asset.status)}</span>
                <span>{dimensions(asset)} · {formatBytes(asset.file_size)}</span>
                <span>{formatTaipeiDateTime(asset.created_at)}</span>
              </span>
            </button>
          ))}
          {!visibleAssets.length ? <div className="media-library-empty">{emptyMessage()}</div> : null}
        </div>

        <aside className="media-library-detail" aria-label="媒體詳細資料">
          {selectedAsset ? (
            <>
              {selectedAsset.media_type === "video"
                ? <video className="media-library-preview" src={selectedAsset.public_url} controls playsInline preload="metadata" />
                : <img className="media-library-preview" src={selectedAsset.public_url} alt={selectedAsset.alt_text || selectedAsset.original_filename || "媒體預覽"} />}
              <div className="media-library-detail-header">
                <h2>{detailTitle(selectedAsset)}</h2>
                <div className="actions">
                  {selectedAsset.status === "active" ? <button className="button ghost" type="button" onClick={() => editDialogRef.current?.showModal()}>編輯</button> : null}
                  <button className="button ghost" type="button" onClick={copySelectedUrl}>複製 URL</button>
                  {shouldShowArchive(selectedAsset) ? <button className="button danger" type="button" onClick={handleArchive} disabled={pending}>封存</button> : null}
                  {shouldShowRestore(selectedAsset) ? <button className="button" type="button" onClick={handleRestore} disabled={pending}>解除封存</button> : null}
                </div>
              </div>
              <dl className="media-library-meta">
                <div><dt>狀態</dt><dd><span className={assetStatusClass(selectedAsset)}>{statusText(selectedAsset)}</span></dd></div>
                <div><dt>圖片 URL</dt><dd><input id={selectedUrlInputId(selectedAsset.id)} className="input" value={selectedAsset.public_url} readOnly /></dd></div>
                <div><dt>Storage Path</dt><dd>{selectedAsset.storage_path}</dd></div>
                <div><dt>替代文字</dt><dd>{detailValue(selectedAsset.alt_text)}</dd></div>
                <div><dt>圖片說明</dt><dd>{detailValue(selectedAsset.caption)}</dd></div>
                <div><dt>用途類型</dt><dd>{usageText(selectedAsset)}</dd></div>
                <div><dt>MIME</dt><dd>{selectedAsset.mime_type}</dd></div>
                <div><dt>類型</dt><dd>{selectedAsset.media_type}</dd></div>
                <div><dt>檔案大小</dt><dd>{formatBytes(selectedAsset.file_size)}{selectedAsset.media_type === "video" && (selectedAsset.file_size || 0) > 20 * 1024 * 1024 ? "（效能警告：超過 20MB）" : ""}</dd></div>
                <div><dt>Poster URL</dt><dd>{detailValue(selectedAsset.poster_url)}</dd></div>
                <div><dt>尺寸</dt><dd>{dimensions(selectedAsset)}</dd></div>
                <div><dt>建立者</dt><dd>{createdByLabel(selectedAsset)}</dd></div>
                <div><dt>建立時間</dt><dd>{formatTaipeiDateTime(selectedAsset.created_at)}</dd></div>
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
            <span>圖片或影片</span>
            <span
              className={`media-upload-dropzone${isDraggingUpload ? " is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingUpload(true);
              }}
              onDragLeave={() => setIsDraggingUpload(false)}
              onDrop={handleUploadDrop}
            >
              <strong>{uploadFile ? uploadFile.name : "拖放圖片或影片到這裡"}</strong>
              <small className="muted">圖片 5MB；首頁影片僅支援 MP4、WebM，上限 30MB</small>
            </span>
            <input
              ref={fileInputRef}
              className="input"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              required={!uploadFile}
              onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
            />
          </label>
          <label className="field full">
            <span>影片 Poster（影片必填）</span>
            <input className="input" name="poster" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
            {uploadFile?.type.startsWith("video/") && uploadFile.size > 20 * 1024 * 1024 ? <small className="notice">影片超過 20MB，可能影響首頁載入效能。</small> : null}
          </label>
          <label className="field">
            <span>用途類型</span>
            <select className="select" name="usage_type" defaultValue="general">
              {mediaUsageTypes.map((value) => <option key={value} value={value}>{mediaOptionLabel(value)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>替代文字</span>
            <input className="input" name="alt_text" maxLength={300} />
          </label>
          <label className="field full">
            <span>圖片說明</span>
            <textarea className="textarea" name="caption" maxLength={500} />
          </label>
          <div className="actions field full">
            <button className="button" type="submit" disabled={pending}>{pending ? "上傳中..." : "上傳"}</button>
            <button className="button ghost" type="button" onClick={closeUploadDialog}>取消</button>
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
              <span>用途類型</span>
              <select className="select" name="usage_type" defaultValue={selectedAsset.usage_type}>
                {mediaUsageTypes.map((value) => <option key={value} value={value}>{mediaOptionLabel(value)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>替代文字</span>
              <input className="input" name="alt_text" maxLength={300} defaultValue={selectedAsset.alt_text || ""} />
            </label>
            <label className="field full">
              <span>圖片說明</span>
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
