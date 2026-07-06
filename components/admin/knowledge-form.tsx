"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdminRole } from "@/lib/auth";
import { imageFitValues, itemTagText, legalStatusValues } from "@/lib/content/schema";
import type { ContentCategory, ContentItem } from "@/lib/content/types";
import { imageFitLabels, legalStatusLabels } from "@/lib/content/types";
import { MediaPicker } from "@/components/admin/media-picker";
import type { MediaLibraryAsset, MediaUsageType } from "@/lib/media";

type Props = {
  categories: ContentCategory[];
  mediaAssets?: MediaLibraryAsset[];
  item?: ContentItem | null;
  role: AdminRole;
  disabled?: boolean;
};

function dateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const coverPreferredUsageTypes: MediaUsageType[] = [
  "knowledge_hero",
  "knowledge_inline",
  "knowledge_gallery",
  "general",
  "hero_banner"
];

const inlinePreferredUsageTypes: MediaUsageType[] = [
  "knowledge_inline",
  "knowledge_gallery",
  "general",
  "property_image"
];

type KnowledgeSaveResponse = {
  ok?: boolean;
  message?: string;
  redirectTo?: string;
  error?: string;
};

export function KnowledgeForm({ categories, mediaAssets = [], item, role, disabled = false }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(!item);
  const [saved, setSaved] = useState(Boolean(item));
  const initialCoverAsset = mediaAssets.find((asset) => asset.public_url === item?.cover_image_url) || null;
  const selectedImageFit = item?.image_fit === "contain" ? "contain" : "cover";
  const [coverMediaId, setCoverMediaId] = useState(initialCoverAsset?.id || "");
  const [coverImageUrl, setCoverImageUrl] = useState(item?.cover_image_url || "");
  const [coverImageFit, setCoverImageFit] = useState(selectedImageFit);
  const [inlineMediaIds, setInlineMediaIds] = useState<string[]>([]);
  const itemId = item?.id || null;
  const selectedLegalStatus = item?.legal_status || "";
  const legalOptions = legalStatusValues.filter((status) => role !== "editor" || status !== "current");
  const slugPreview = item?.slug ? `/knowledge/${item.slug}` : "儲存後由系統產生";

  function markDirty() {
    setIsDirty(true);
    setSaved(false);
    setError(null);
  }

  useEffect(() => {
    const savedToast = sessionStorage.getItem("knowledge-toast");
    if (savedToast) {
      sessionStorage.removeItem("knowledge-toast");
      setToast(savedToast);
      setSaved(true);
      setIsDirty(false);
      return;
    }
    if (searchParams.get("saved")) {
      setToast("知識內容已儲存。");
      setSaved(true);
      setIsDirty(false);
    }
  }, [searchParams]);

  useEffect(() => {
    setSaved(Boolean(itemId));
    setIsDirty(!itemId);
    setError(null);
    setCoverMediaId(initialCoverAsset?.id || "");
    setCoverImageUrl(item?.cover_image_url || "");
    setCoverImageFit(selectedImageFit);
  }, [initialCoverAsset?.id, item?.cover_image_url, itemId, selectedImageFit]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const endpoint = itemId ? `/api/admin/knowledge/${itemId}` : "/api/admin/knowledge";
    const method = itemId ? "PATCH" : "POST";

    startTransition(async () => {
      try {
        const response = await fetch(endpoint, { method, body: formData });
        const result = (await response.json().catch(() => null)) as KnowledgeSaveResponse | null;
        if (!response.ok || !result?.ok) {
          setError(result?.message || result?.error || "儲存失敗，請稍後再試。");
          return;
        }

        const message = result.message || "知識內容已儲存。";
        setSaved(true);
        setIsDirty(false);
        setError(null);
        if (result.redirectTo) {
          sessionStorage.setItem("knowledge-toast", message);
          router.replace(result.redirectTo);
          return;
        }
        setToast(message);
        router.refresh();
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "";
        setError(message || "儲存失敗，請稍後再試。");
      }
    });
  }

  function handleCoverSelect(asset: MediaLibraryAsset) {
    setCoverMediaId(asset.id);
    setCoverImageUrl(asset.public_url);
    markDirty();
  }

  function insertInlineImage(asset: MediaLibraryAsset) {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const alt = asset.alt_text || asset.original_filename || "圖片";
    const markdown = `\n\n![${alt}](${asset.public_url})\n\n`;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    textarea.value = `${textarea.value.slice(0, start)}${markdown}${textarea.value.slice(end)}`;
    const nextPosition = start + markdown.length;
    textarea.focus();
    textarea.setSelectionRange(nextPosition, nextPosition);
    setInlineMediaIds((current) => Array.from(new Set([...current, asset.id])));
    markDirty();
  }

  const buttonText = pending
    ? "儲存中..."
    : item
      ? isDirty
        ? "更新知識內容"
        : "已儲存"
      : saved
        ? "已儲存成功"
        : "建立草稿";
  const submitDisabled = disabled || pending || (saved && !isDirty);

  return (
    <form ref={formRef} className="form-grid" onSubmit={handleSubmit} onChange={markDirty}>
      {toast ? <div className="success field full" role="status">{toast}</div> : null}
      {error ? <div className="notice field full" role="alert">{error}</div> : null}
      <div className="field">
        <span>標題</span>
        <input className="input" name="title" defaultValue={item?.title || ""} required disabled={disabled || pending} />
      </div>

      <div className="field">
        <span>Slug</span>
        <input className="input" name="slug" defaultValue={item?.slug || ""} placeholder="可留空，系統自動產生" disabled={disabled || pending} />
      </div>

      <div className="field">
        <span>分類</span>
        <select className="select" name="category_id" defaultValue={item?.category_id || ""} disabled={disabled || pending}>
          <option value="">未分類</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <span>排序</span>
        <input className="input" type="number" name="sort_order" defaultValue={item?.sort_order ?? 1000} disabled={disabled || pending} />
      </div>

      <div className="field full">
        <span>標籤</span>
        <input className="input" name="tags" defaultValue={itemTagText(item)} placeholder="用逗號或換行分隔" disabled={disabled || pending} />
      </div>

      <div className="field full">
        <span>摘要</span>
        <textarea className="textarea" name="summary" rows={3} defaultValue={item?.summary || ""} disabled={disabled || pending} />
      </div>

      <div className="field full">
        <span>內文</span>
        <textarea ref={bodyRef} className="textarea" name="body" rows={14} defaultValue={item?.body || ""} disabled={disabled || pending} />
      </div>

      <details className="field full" open>
        <summary>媒體中心圖片</summary>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <input type="hidden" name="cover_image_url" value={coverImageUrl} />
          <input type="hidden" name="inline_media_ids" value={inlineMediaIds.join(",")} />
          <input type="hidden" name="cover_media_id" value={coverMediaId} />
          <label className="field">
            <span>封面顯示方式</span>
            <select
              className="select"
              name="image_fit"
              value={coverImageFit}
              disabled={disabled || pending}
              onChange={(event) => {
                setCoverImageFit(event.target.value === "contain" ? "contain" : "cover");
                markDirty();
              }}
            >
              {imageFitValues.map((fit) => (
                <option key={fit} value={fit}>{imageFitLabels[fit]}</option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>顯示提示</span>
            <small className="muted">裁切填滿適合情境照片；完整顯示適合 Logo、截圖、QRCode 或不想裁切的圖片。</small>
          </div>
          <div className="field full">
            <MediaPicker
              assets={mediaAssets}
              disabled={disabled || pending}
              preferredUsageTypes={coverPreferredUsageTypes}
              selectedId={coverMediaId}
              title="封面圖片"
              onSelect={handleCoverSelect}
            />
            <small className="muted">優先建議：知識庫封面、知識庫內文、知識庫圖庫、一般圖片、首頁 Banner；其他啟用圖片也可引用。</small>
          </div>
          {coverImageUrl ? (
            <div className="field full">
              <img className={`knowledge-card-image is-${coverImageFit}`} src={coverImageUrl} alt={item?.title || "知識封面預覽"} />
            </div>
          ) : null}
          <div className="field full">
            <MediaPicker
              assets={mediaAssets}
              disabled={disabled || pending}
              preferredUsageTypes={inlinePreferredUsageTypes}
              title="插入內文圖片"
              onSelect={insertInlineImage}
            />
            <small className="muted">優先建議：知識庫內文、知識庫圖庫、一般圖片、物件圖片；其他啟用圖片也可引用。點擊圖片即可插入 Markdown。</small>
          </div>
        </div>
      </details>

      <details className="field full" open>
        <summary>進階 SEO 設定</summary>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field full">
            <span>SEO 網頁標題</span>
            <input className="input" name="seo_title" defaultValue={item?.seo_title || ""} disabled={disabled || pending} />
            <small className="muted">空白時使用知識標題 fallback。</small>
          </div>
          <div className="field full">
            <span>Meta Description</span>
            <textarea className="textarea" name="meta_description" rows={3} defaultValue={item?.meta_description || ""} disabled={disabled || pending} />
            <small className="muted">空白時使用摘要或內文前段 fallback。</small>
          </div>
          <div className="field full">
            <span>Canonical</span>
            <input className="input" value={slugPreview} readOnly />
          </div>
        </div>
      </details>

      <details className="field full" open>
        <summary>法規 / 資料來源維護</summary>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <span>法規狀態</span>
            <select className="select" name="legal_status" defaultValue={selectedLegalStatus} disabled={disabled || pending}>
              <option value="">一般內容</option>
              {legalOptions.map((status) => (
                <option key={status} value={status}>{legalStatusLabels[status]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <span>複查週期（天）</span>
            <input className="input" type="number" min="1" name="review_cycle_days" defaultValue={item?.review_cycle_days || ""} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>有效起日</span>
            <input className="input" type="date" name="effective_from" defaultValue={dateInputValue(item?.effective_from)} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>有效迄日</span>
            <input className="input" type="date" name="effective_to" defaultValue={dateInputValue(item?.effective_to)} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>最後複查日</span>
            <input className="input" type="date" name="last_reviewed_at" defaultValue={dateInputValue(item?.last_reviewed_at)} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>下次複查日</span>
            <input className="input" type="date" name="next_review_at" defaultValue={dateInputValue(item?.next_review_at)} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>來源名稱</span>
            <input className="input" name="source_name" defaultValue={item?.source_name || ""} disabled={disabled || pending} />
          </div>
          <div className="field">
            <span>來源連結</span>
            <input className="input" name="source_url" defaultValue={item?.source_url || ""} disabled={disabled || pending} />
          </div>
        </div>
      </details>

      <div className="field full">
        <button className="button" type="submit" disabled={submitDisabled}>{buttonText}</button>
      </div>
    </form>
  );
}
