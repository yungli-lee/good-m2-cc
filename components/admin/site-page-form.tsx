"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import { cmsStatusLabels, sitePageLabels, sitePageKeys, type SitePage } from "@/lib/home-cms/types";
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

export function SitePageForm({ page, mediaAssets }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const initialAsset = mediaAssets.find((asset) => asset.id === page?.cover_media_id) || null;
  const [mediaId, setMediaId] = useState(initialAsset?.id || "");
  const [coverUrl, setCoverUrl] = useState("");

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
        <span>頁面</span>
        <select className="select" name="page_key" defaultValue={page?.page_key || "philosophy"} disabled={Boolean(page) || pending}>
          {sitePageKeys.map((key) => <option key={key} value={key}>{sitePageLabels[key]}</option>)}
        </select>
        {page ? <input type="hidden" name="page_key" value={page.page_key} /> : null}
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
        <input className="input" name="title" defaultValue={page?.title || ""} required disabled={pending} />
      </label>
      <label className="field full">
        <span>副標</span>
        <input className="input" name="subtitle" defaultValue={page?.subtitle || ""} disabled={pending} />
      </label>
      <label className="field full">
        <span>內容（Markdown）</span>
        <textarea className="textarea" name="markdown_content" rows={12} defaultValue={page?.markdown_content || ""} disabled={pending} />
      </label>
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
      </div>
      <label className="field full">
        <span>Fallback 封面 URL</span>
        <input className="input" name="fallback_cover_url" defaultValue={page?.fallback_cover_url || coverUrl} disabled={pending} />
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
