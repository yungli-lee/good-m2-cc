"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdminRole } from "@/lib/auth";
import { imageFitValues, itemTagText, legalStatusValues } from "@/lib/content/schema";
import type { ContentCategory, ContentItem } from "@/lib/content/types";
import { imageFitLabels, legalStatusLabels } from "@/lib/content/types";
import { MediaPicker } from "@/components/admin/media-picker";
import { RichKnowledgeEditor } from "@/components/admin/rich-knowledge-editor";
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

type InlineImageEntry = {
  alt: string;
  asset: MediaLibraryAsset | null;
  caption: string;
  end: number;
  filename: string;
  start: number;
  url: string;
};

function mediaAssetName(asset?: MediaLibraryAsset | null) {
  return asset?.original_filename || asset?.alt_text || asset?.caption || asset?.id || "";
}

function normalizeImageUrl(value: string) {
  return value.trim().replace(/\s+["'][\s\S]*["']$/, "");
}

function markdownEscape(value?: string | null) {
  return String(value || "").replace(/[\[\]\n\r]/g, " ").replace(/"/g, "'").replace(/\s+/g, " ").trim();
}

function markdownImageForAsset(asset: MediaLibraryAsset) {
  const alt = markdownEscape(asset.alt_text);
  const caption = markdownEscape(asset.caption);
  return caption ? `![${alt}](${asset.public_url} "${caption}")` : `![${alt}](${asset.public_url})`;
}

function imageCaptionFromTitle(value?: string | null) {
  return String(value || "")
    .replace(/\s*\bwidth=(25%|50%|75%|100%)(?=\s|$)/gi, "")
    .replace(/\s*\balign=(left|center|right)\b/gi, "")
    .trim();
}

function isLikelyImageUrl(value: string) {
  const url = normalizeImageUrl(value);
  if (!/^https?:\/\//i.test(url)) return false;
  return /\.(avif|gif|jpe?g|png|webp)([?#].*)?$/i.test(url) || /\/storage\/v1\/object\/public\/|\/media\//i.test(url);
}

function extractInlineImages(body: string, assets: MediaLibraryAsset[]): InlineImageEntry[] {
  const assetByUrl = new Map(assets.map((asset) => [asset.public_url, asset]));
  const images: InlineImageEntry[] = [];
  const imagePattern = /!\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)/g;
  const bareUrlPattern = /^[\t ]*(https?:\/\/[^\s<>)]+)[\t ]*$/gm;
  let match: RegExpExecArray | null;

  while ((match = imagePattern.exec(body)) !== null) {
    const url = normalizeImageUrl(match[2] || "");
    if (!isLikelyImageUrl(url)) continue;
    const asset = assetByUrl.get(url) || null;
    const alt = (match[1] || "").trim();
    const caption = imageCaptionFromTitle(match[3]) || asset?.caption || "";
    images.push({
      alt,
      asset,
      caption,
      end: match.index + match[0].length,
      filename: mediaAssetName(asset) || "既有 URL 圖片",
      start: match.index,
      url
    });
  }

  while ((match = bareUrlPattern.exec(body)) !== null) {
    const url = normalizeImageUrl(match[1] || "");
    if (!isLikelyImageUrl(url)) continue;
    const asset = assetByUrl.get(url) || null;
    images.push({
      alt: asset?.alt_text || "",
      asset,
      caption: asset?.caption || "",
      end: match.index + match[0].length,
      filename: mediaAssetName(asset) || "既有 URL 圖片",
      start: match.index,
      url
    });
  }

  return images.sort((a, b) => a.start - b.start);
}

function paragraphRange(body: string, image: InlineImageEntry) {
  const previousBreak = body.lastIndexOf("\n\n", image.start);
  const nextBreak = body.indexOf("\n\n", image.end);
  return {
    start: previousBreak === -1 ? 0 : previousBreak + 2,
    end: nextBreak === -1 ? body.length : nextBreak
  };
}

function replaceInlineRange(body: string, image: InlineImageEntry, replacement: string) {
  return `${body.slice(0, image.start)}${replacement}${body.slice(image.end)}`;
}

function moveInlineImage(body: string, image: InlineImageEntry, sibling: InlineImageEntry) {
  const first = image.start < sibling.start ? image : sibling;
  const second = image.start < sibling.start ? sibling : image;
  const firstRange = paragraphRange(body, first);
  const secondRange = paragraphRange(body, second);
  if (firstRange.end > secondRange.start) return body;

  const firstText = body.slice(firstRange.start, firstRange.end);
  const middle = body.slice(firstRange.end, secondRange.start);
  const secondText = body.slice(secondRange.start, secondRange.end);
  const moved = `${body.slice(0, firstRange.start)}${secondText}${middle}${firstText}${body.slice(secondRange.end)}`;
  return moved.replace(/\n{3,}/g, "\n\n");
}

export function KnowledgeForm({ categories, mediaAssets = [], item, role, disabled = false }: Props) {
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
  const [bodyContent, setBodyContent] = useState(item?.body || "");
  const [insertImageRequest, setInsertImageRequest] = useState<{ asset: MediaLibraryAsset; id: number } | null>(null);
  const [focusImageUrl, setFocusImageUrl] = useState<string | null>(null);
  const [replaceImageStart, setReplaceImageStart] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const itemId = item?.id || null;
  const selectedLegalStatus = item?.legal_status || "";
  const legalOptions = legalStatusValues.filter((status) => role !== "editor" || status !== "current");
  const slugPreview = item?.slug ? `/knowledge/${item.slug}` : "儲存後由系統產生";
  const coverAsset = coverMediaId
    ? mediaAssets.find((asset) => asset.id === coverMediaId) || null
    : mediaAssets.find((asset) => asset.public_url === coverImageUrl) || null;
  const inlineImages = useMemo(() => extractInlineImages(bodyContent, mediaAssets), [bodyContent, mediaAssets]);
  const inlineMediaIds = useMemo(
    () => Array.from(new Set(inlineImages.map((image) => image.asset?.id).filter((id): id is string => Boolean(id)))),
    [inlineImages]
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
    setCoverImageFit(selectedImageFit);
    setBodyContent(item?.body || "");
  }, [initialCoverAsset?.id, item?.body, item?.cover_image_url, itemId, selectedImageFit]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty || saving) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (!isDirty || saving) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target) return;
      const anchor = target as HTMLAnchorElement;
      if (anchor.target || anchor.href.startsWith("mailto:") || anchor.href.startsWith("tel:")) return;
      if (!window.confirm("尚有未儲存的變更，確定要離開嗎？")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty, saving]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    const endpoint = itemId ? `/api/admin/knowledge/${itemId}` : "/api/admin/knowledge";
    const method = itemId ? "PATCH" : "POST";

    startTransition(async () => {
      try {
        const response = await fetch(endpoint, { method, body: formData });
        const result = (await response.json().catch(() => null)) as KnowledgeSaveResponse | null;
        if (!response.ok || !result?.ok) {
          setError(result?.message || result?.error || "儲存失敗，請稍後再試。");
          setSaving(false);
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
        setSaving(false);
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "";
        setError(message || "儲存失敗，請稍後再試。");
        setSaving(false);
      }
    });
  }

  function handleCoverSelect(asset: MediaLibraryAsset) {
    setCoverMediaId(asset.id);
    setCoverImageUrl(asset.public_url);
    markDirty();
  }

  function removeCoverImage() {
    setCoverMediaId("");
    setCoverImageUrl("");
    markDirty();
  }

  function insertInlineImage(asset: MediaLibraryAsset) {
    setInsertImageRequest({ asset, id: Date.now() });
    markDirty();
  }

  function locateInlineImage(image: InlineImageEntry) {
    setFocusImageUrl(null);
    window.requestAnimationFrame(() => setFocusImageUrl(image.url));
  }

  function removeInlineImage(image: InlineImageEntry) {
    const before = bodyContent.slice(0, image.start);
    const after = bodyContent.slice(image.end);
    const nextBody = `${before}${after}`.replace(/\n{3,}/g, "\n\n").trim();
    setBodyContent(nextBody);
    markDirty();
  }

  function replaceInlineImage(image: InlineImageEntry, asset: MediaLibraryAsset) {
    const nextBody = replaceInlineRange(bodyContent, image, markdownImageForAsset(asset));
    setBodyContent(nextBody);
    setReplaceImageStart(null);
    markDirty();
  }

  function moveImage(image: InlineImageEntry, direction: "up" | "down") {
    const index = inlineImages.findIndex((item) => item.start === image.start && item.url === image.url);
    const sibling = direction === "up" ? inlineImages[index - 1] : inlineImages[index + 1];
    if (!sibling) return;
    setBodyContent(moveInlineImage(bodyContent, image, sibling));
    markDirty();
  }

  const buttonText = pending || saving
    ? "儲存中..."
    : item
      ? isDirty
        ? "更新知識內容"
        : "已儲存"
      : saved
        ? "已儲存成功"
        : "建立草稿";
  const submitDisabled = disabled || pending || saving || (saved && !isDirty);

  return (
    <form className="form-grid" onSubmit={handleSubmit} onChange={markDirty}>
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

      <div className="field full knowledge-editor-section">
        <div className="knowledge-editor-header">
          <span>內文</span>
          <small className="muted">WYSIWYG 編輯器；儲存時仍寫入 Markdown。</small>
        </div>
        <input type="hidden" name="body" value={bodyContent} />
        <RichKnowledgeEditor
          disabled={disabled || pending || saving}
          focusImageUrl={focusImageUrl}
          insertImageRequest={insertImageRequest}
          value={bodyContent}
          onChange={setBodyContent}
          onDirty={markDirty}
        />
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
              disabled={disabled || pending || saving}
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
            <div className="field full knowledge-cover-current">
              <div className="knowledge-cover-current-header">
                <div>
                  <strong>目前封面圖片</strong>
                  <small className="muted">
                    {coverAsset ? mediaAssetName(coverAsset) : "既有 URL 圖片"}
                  </small>
                  <small className="muted">
                    {coverAsset ? "已連結媒體中心圖片" : "既有圖片網址（仍會正常保留與顯示）"}
                  </small>
                </div>
                <button
                  className="button ghost"
                  type="button"
                  disabled={disabled || pending || saving}
                  onClick={removeCoverImage}
                >
                  移除封面
                </button>
              </div>
              <img className={`knowledge-card-image is-${coverImageFit}`} src={coverImageUrl} alt={item?.title || "知識封面預覽"} />
              <small className="muted knowledge-cover-current-url">{coverImageUrl}</small>
            </div>
          ) : (
            <div className="field full knowledge-cover-empty">
              <strong>目前沒有封面圖片</strong>
              <small className="muted">請從上方媒體中心選擇圖片；儲存前仍可更換。</small>
            </div>
          )}
          <div className="field full">
            <MediaPicker
              assets={mediaAssets}
              disabled={disabled || pending || saving}
              preferredUsageTypes={inlinePreferredUsageTypes}
              title="插入內文圖片"
              onSelect={insertInlineImage}
            />
            <small className="muted">優先建議：知識庫內文、知識庫圖庫、一般圖片、物件圖片；其他啟用圖片也可引用。點擊圖片即可插入 Markdown。</small>
          </div>
          <div className="field full knowledge-inline-manager">
            <div className="knowledge-inline-manager-header">
              <div>
                <strong>文章內圖片</strong>
                <small className="muted">從內文 Markdown 自動讀取，舊文章 URL 圖片也會列在這裡。</small>
              </div>
              <span className="muted">{inlineImages.length} 張圖片</span>
            </div>
            {inlineImages.length ? (
              <div className="knowledge-inline-list">
                {inlineImages.map((image) => (
                  <div className="knowledge-inline-item" key={`${image.start}-${image.url}`}>
                    <img src={image.url} alt={image.alt} loading="lazy" />
                    <div>
                      <strong>{image.filename}</strong>
                      <small className={image.alt ? "muted" : "notice-inline"}>
                        {image.alt || "缺少 alt 文字，建議補上圖片替代文字"}
                      </small>
                      <small className="muted">{image.caption ? `Caption：${image.caption}` : "Caption：-"}</small>
                      <small className="muted knowledge-cover-current-url">{image.url}</small>
                    </div>
                    <div className="knowledge-inline-actions">
                      <button className="button ghost" type="button" disabled={disabled || pending || saving} onClick={() => locateInlineImage(image)}>定位</button>
                      <button className="button ghost" type="button" disabled={disabled || pending || saving} onClick={() => setReplaceImageStart(image.start)}>替換</button>
                      <button className="button ghost" type="button" disabled={disabled || pending || saving || inlineImages[0] === image} onClick={() => moveImage(image, "up")}>上移</button>
                      <button className="button ghost" type="button" disabled={disabled || pending || saving || inlineImages[inlineImages.length - 1] === image} onClick={() => moveImage(image, "down")}>下移</button>
                      <button className="button ghost" type="button" disabled={disabled || pending || saving} onClick={() => removeInlineImage(image)}>移除</button>
                    </div>
                    {replaceImageStart === image.start ? (
                      <div className="knowledge-inline-replace">
                        <div className="knowledge-inline-manager-header">
                          <strong>選擇替換圖片</strong>
                          <button className="button ghost" type="button" onClick={() => setReplaceImageStart(null)}>取消</button>
                        </div>
                        <MediaPicker
                          assets={mediaAssets}
                          disabled={disabled || pending || saving}
                          preferredUsageTypes={inlinePreferredUsageTypes}
                          title="替換內文圖片"
                          onSelect={(asset) => replaceInlineImage(image, asset)}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="knowledge-cover-empty">
                <strong>目前內文沒有圖片</strong>
                <small className="muted">可從上方媒體中心點選圖片插入。</small>
              </div>
            )}
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
