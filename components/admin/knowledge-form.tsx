"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdminRole } from "@/lib/auth";
import { itemTagText, legalStatusValues } from "@/lib/content/schema";
import type { KnowledgeActionResult } from "@/app/admin/knowledge/actions";
import type { ContentCategory, ContentItem } from "@/lib/content/types";
import { legalStatusLabels } from "@/lib/content/types";
import { mediaUsageTypeLabels } from "@/lib/media";
import type { MediaLibraryAsset, MediaUsageType } from "@/lib/media";

type Props = {
  action: (formData: FormData) => Promise<KnowledgeActionResult>;
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

const coverPreferredUsageTypes = new Set<MediaUsageType>([
  "knowledge_hero",
  "knowledge_inline",
  "knowledge_gallery",
  "general",
  "hero_banner"
]);

const inlinePreferredUsageTypes = new Set<MediaUsageType>([
  "knowledge_inline",
  "knowledge_gallery",
  "general",
  "property_image"
]);

function mediaLabel(asset: MediaLibraryAsset, preferred: Set<MediaUsageType>) {
  const prefix = preferred.has(asset.usage_type) ? "建議" : "可用";
  const name = asset.original_filename || asset.alt_text || asset.id;
  return `${prefix}｜${mediaUsageTypeLabels[asset.usage_type]}｜${name}`;
}

export function KnowledgeForm({ action, categories, mediaAssets = [], item, role, disabled = false }: Props) {
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
  const [coverMediaId, setCoverMediaId] = useState(initialCoverAsset?.id || "");
  const [coverImageUrl, setCoverImageUrl] = useState(item?.cover_image_url || "");
  const [inlineMediaId, setInlineMediaId] = useState(mediaAssets[0]?.id || "");
  const [inlineMediaIds, setInlineMediaIds] = useState<string[]>([]);
  const itemId = item?.id || null;
  const selectedLegalStatus = item?.legal_status || "";
  const legalOptions = legalStatusValues.filter((status) => role !== "editor" || status !== "current");
  const slugPreview = item?.slug ? `/knowledge/${item.slug}` : "儲存後由系統產生";
  const mediaById = useMemo(() => new Map(mediaAssets.map((asset) => [asset.id, asset])), [mediaAssets]);
  const coverOptions = useMemo(
    () => [...mediaAssets].sort((a, b) => Number(coverPreferredUsageTypes.has(b.usage_type)) - Number(coverPreferredUsageTypes.has(a.usage_type))),
    [mediaAssets]
  );
  const inlineOptions = useMemo(
    () => [...mediaAssets].sort((a, b) => Number(inlinePreferredUsageTypes.has(b.usage_type)) - Number(inlinePreferredUsageTypes.has(a.usage_type))),
    [mediaAssets]
  );

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
  }, [initialCoverAsset?.id, item?.cover_image_url, itemId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (!result.ok) {
          setError(result.message || "儲存失敗，請稍後再試。");
          return;
        }

        const message = result.message || "知識內容已儲存。";
        setSaved(true);
        setIsDirty(false);
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

  function handleCoverChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextId = event.target.value;
    const asset = mediaById.get(nextId) || null;
    setCoverMediaId(nextId);
    setCoverImageUrl(asset?.public_url || "");
    markDirty();
  }

  function insertInlineImage() {
    const asset = mediaById.get(inlineMediaId);
    const textarea = bodyRef.current;
    if (!asset || !textarea) return;

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
          <label className="field full">
            <span>封面圖片</span>
            <select className="select" name="cover_media_id" value={coverMediaId} onChange={handleCoverChange} disabled={disabled || pending}>
              <option value="">不設定封面</option>
              {coverOptions.map((asset) => (
                <option key={asset.id} value={asset.id}>{mediaLabel(asset, coverPreferredUsageTypes)}</option>
              ))}
            </select>
            <small className="muted">優先建議：知識庫封面、知識庫內文、知識庫圖庫、一般圖片、首頁 Banner；其他啟用圖片也可引用。</small>
          </label>
          {coverImageUrl ? (
            <div className="field full">
              <img className="knowledge-card-image" src={coverImageUrl} alt={item?.title || "知識封面預覽"} />
            </div>
          ) : null}
          <label className="field">
            <span>插入內文圖片</span>
            <select className="select" value={inlineMediaId} onChange={(event) => setInlineMediaId(event.target.value)} disabled={disabled || pending || !inlineOptions.length}>
              {inlineOptions.map((asset) => (
                <option key={asset.id} value={asset.id}>{mediaLabel(asset, inlinePreferredUsageTypes)}</option>
              ))}
            </select>
            <small className="muted">優先建議：知識庫內文、知識庫圖庫、一般圖片、物件圖片；其他啟用圖片也可引用。</small>
          </label>
          <div className="field" style={{ alignSelf: "end" }}>
            <button className="button ghost" type="button" onClick={insertInlineImage} disabled={disabled || pending || !inlineMediaId}>插入圖片</button>
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
