"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import { cmsStatusLabels, type SitePage } from "@/lib/home-cms/types";
import type { MediaLibraryAsset, MediaUsageType } from "@/lib/media";

type Props = {
  page?: SitePage | null;
  mediaAssets: MediaLibraryAsset[];
};

type SaveResponse = {
  ok?: boolean;
  message?: string;
  redirectTo?: string;
};

const preferredUsageTypes: MediaUsageType[] = ["hero_banner", "general", "knowledge_hero", "knowledge_inline"];

function suggestedSlug(title: string) {
  const value = title
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return value || (title.trim() ? "new-page" : "");
}

export function SitePageForm({ page, mediaAssets }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const initialAsset = mediaAssets.find((asset) => asset.id === page?.cover_media_id) || null;
  const [mediaId, setMediaId] = useState(initialAsset?.id || "");
  const [coverUrl, setCoverUrl] = useState(page?.fallback_cover_url || "");
  const [body, setBody] = useState(page?.markdown_content || "");
  const [inlineAssetId, setInlineAssetId] = useState("");
  const [title, setTitle] = useState(page?.title || "");
  const [slug, setSlug] = useState(page?.page_key || "");
  const [slugEdited, setSlugEdited] = useState(Boolean(page?.page_key));
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!slugEdited) setSlug(suggestedSlug(title));
  }, [slugEdited, title]);

  function insertInlineImage(asset: MediaLibraryAsset) {
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? start;
    const alt = (asset.alt_text || asset.caption || asset.original_filename || "內文圖片")
      .replace(/[[\]]/g, "");
    const markdown = `![${alt}](${asset.public_url})`;
    const before = body.slice(0, start).replace(/\s*$/, "");
    const after = body.slice(end).replace(/^\s*/, "");
    const nextBody = [before, markdown, after].filter(Boolean).join("\n\n");
    setBody(nextBody);
    setInlineAssetId(asset.id);
    window.requestAnimationFrame(() => {
      const cursor = before.length + (before ? 2 : 0) + markdown.length;
      textarea?.focus();
      textarea?.setSelectionRange(cursor, cursor);
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setToast(null);
    const endpoint = page?.id ? `/api/admin/site-pages/${page.id}` : "/api/admin/site-pages";
    const method = page?.id ? "PATCH" : "POST";
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const response = await fetch(endpoint, { method, body: formData });
        const result = (await response.json().catch(() => null)) as SaveResponse | null;
        if (!response.ok || !result?.ok) {
          setError(result?.message || "儲存失敗，請稍後再試。");
          return;
        }

        setToast(result.message || "頁面內容已儲存。");
        if (result.redirectTo) {
          router.replace(result.redirectTo);
          router.refresh();
          return;
        }
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "儲存失敗，請稍後再試。");
      }
    });
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      {toast ? <div className="success field full" role="status">{toast}</div> : null}
      {error ? <div className="notice field full" role="alert">{error}</div> : null}
      <label className="field">
        <span>Slug</span>
        <input
          className="input"
          name="page_key"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          value={slug}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(event.target.value);
          }}
          placeholder="例如：life-notes"
          required
          disabled={pending}
        />
        <small className="muted">可自行修改；僅限小寫英文字母、數字與連字號。既有「阿勇生活小提醒」入口仍使用 reminders。</small>
      </label>
      <label className="field">
        <span>狀態</span>
        <select className="select" name="status" defaultValue={page?.status || "draft"} disabled={pending}>
          {Object.entries(cmsStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>排序</span>
        <input className="input" type="number" min="0" name="sort_order" defaultValue={page?.sort_order ?? 1000} disabled={pending} />
      </label>
      <label className="field full">
        <span>標題</span>
        <input className="input" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required disabled={pending} />
      </label>
      <label className="field full">
        <span>Eyebrow / 分類標籤</span>
        <input className="input" name="eyebrow" defaultValue={page?.eyebrow || ""} disabled={pending} />
      </label>
      <label className="field full">
        <span>副標 / 摘要</span>
        <input className="input" name="subtitle" defaultValue={page?.subtitle || ""} disabled={pending} />
      </label>
      <label className="field full">
        <span>內容（Markdown）</span>
        <textarea
          className="textarea"
          name="markdown_content"
          rows={16}
          ref={bodyRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={pending}
        />
        <small className="muted">將游標放在要插入的位置，再從下方選擇內文圖片。刪除內容中的圖片 Markdown 即可移除圖片。</small>
      </label>
      <div className="field full">
        <MediaPicker
          assets={mediaAssets}
          preferredUsageTypes={["knowledge_inline", "knowledge_gallery", "general"]}
          selectedId={inlineAssetId}
          title="新增或更換內文圖片"
          disabled={pending}
          onSelect={insertInlineImage}
        />
      </div>
      <input type="hidden" name="cover_media_id" value={mediaId} />
      <div className="field full">
        <MediaPicker
          assets={mediaAssets}
          preferredUsageTypes={preferredUsageTypes}
          selectedId={mediaId}
          title="封面圖片"
          disabled={pending}
          onSelect={(asset) => {
            setMediaId(asset.id);
            setCoverUrl(asset.public_url);
          }}
        />
        {mediaId || coverUrl ? (
          <button
            className="button ghost"
            type="button"
            disabled={pending}
            onClick={() => {
              setMediaId("");
              setCoverUrl("");
            }}
          >
            移除目前主圖
          </button>
        ) : null}
      </div>
      <label className="field full">
        <span>Fallback 封面 URL</span>
        <input className="input" name="fallback_cover_url" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} disabled={pending} />
      </label>
      <label className="field full">
        <span>SEO Title</span>
        <input className="input" name="seo_title" defaultValue={page?.seo_title || ""} disabled={pending} />
      </label>
      <label className="field full">
        <span>SEO Description</span>
        <textarea className="textarea" name="seo_description" rows={3} defaultValue={page?.seo_description || ""} disabled={pending} />
      </label>
      <div className="actions full">
        <button className="button" type="submit" disabled={pending}>{pending ? "儲存中..." : "儲存頁面內容"}</button>
      </div>
    </form>
  );
}
