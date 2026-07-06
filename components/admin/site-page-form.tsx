"use client";

import { useState } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import { cmsStatusLabels, sitePageLabels, sitePageKeys, type SitePage } from "@/lib/home-cms/types";
import type { MediaLibraryAsset, MediaUsageType } from "@/lib/media";

type Props = {
  action: (formData: FormData) => void;
  page?: SitePage | null;
  mediaAssets: MediaLibraryAsset[];
};

const preferredUsageTypes: MediaUsageType[] = ["hero_banner", "general", "knowledge_hero", "knowledge_inline"];

export function SitePageForm({ action, page, mediaAssets }: Props) {
  const initialAsset = mediaAssets.find((asset) => asset.id === page?.cover_media_id) || null;
  const [mediaId, setMediaId] = useState(initialAsset?.id || "");
  const [coverUrl, setCoverUrl] = useState("");

  return (
    <form className="form-grid" action={action}>
      <label className="field">
        <span>頁面</span>
        <select className="select" name="page_key" defaultValue={page?.page_key || "philosophy"} disabled={Boolean(page)}>
          {sitePageKeys.map((key) => <option key={key} value={key}>{sitePageLabels[key]}</option>)}
        </select>
        {page ? <input type="hidden" name="page_key" value={page.page_key} /> : null}
      </label>
      <label className="field">
        <span>狀態</span>
        <select className="select" name="status" defaultValue={page?.status || "draft"}>
          {Object.entries(cmsStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>排序</span>
        <input className="input" type="number" min="0" name="sort_order" defaultValue={page?.sort_order ?? 1000} />
      </label>
      <label className="field full">
        <span>標題</span>
        <input className="input" name="title" defaultValue={page?.title || ""} required />
      </label>
      <label className="field full">
        <span>副標</span>
        <input className="input" name="subtitle" defaultValue={page?.subtitle || ""} />
      </label>
      <label className="field full">
        <span>內容（Markdown）</span>
        <textarea className="textarea" name="markdown_content" rows={12} defaultValue={page?.markdown_content || ""} />
      </label>
      <input type="hidden" name="cover_media_id" value={mediaId} />
      <div className="field full">
        <MediaPicker
          assets={mediaAssets}
          preferredUsageTypes={preferredUsageTypes}
          selectedId={mediaId}
          title="封面圖片"
          onSelect={(asset) => {
            setMediaId(asset.id);
            setCoverUrl(asset.public_url);
          }}
        />
      </div>
      <label className="field full">
        <span>Fallback 封面 URL</span>
        <input className="input" name="fallback_cover_url" defaultValue={page?.fallback_cover_url || coverUrl} />
      </label>
      <label className="field full">
        <span>SEO Title</span>
        <input className="input" name="seo_title" defaultValue={page?.seo_title || ""} />
      </label>
      <label className="field full">
        <span>SEO Description</span>
        <textarea className="textarea" name="seo_description" rows={3} defaultValue={page?.seo_description || ""} />
      </label>
      <div className="actions full">
        <button className="button" type="submit">儲存頁面內容</button>
      </div>
    </form>
  );
}
