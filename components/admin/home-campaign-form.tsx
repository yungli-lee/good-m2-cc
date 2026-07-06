"use client";

import { useState } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import type { HomeCampaign } from "@/lib/home-cms/types";
import { cmsStatusLabels } from "@/lib/home-cms/types";
import type { MediaLibraryAsset, MediaUsageType } from "@/lib/media";

type Props = {
  action: (formData: FormData) => void;
  campaign?: HomeCampaign | null;
  mediaAssets: MediaLibraryAsset[];
};

const preferredUsageTypes: MediaUsageType[] = ["hero_banner", "general", "knowledge_hero"];

function datetimeValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export function HomeCampaignForm({ action, campaign, mediaAssets }: Props) {
  const initialAsset = mediaAssets.find((asset) => asset.id === campaign?.image_media_id) || null;
  const [mediaId, setMediaId] = useState(initialAsset?.id || "");
  const [imageUrl, setImageUrl] = useState("");

  return (
    <form className="form-grid" action={action}>
      <label className="field">
        <span>狀態</span>
        <select className="select" name="status" defaultValue={campaign?.status || "draft"}>
          {Object.entries(cmsStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>排序</span>
        <input className="input" type="number" min="0" name="sort_order" defaultValue={campaign?.sort_order ?? 1000} />
      </label>
      <label className="field">
        <span>上架開始</span>
        <input className="input" type="datetime-local" name="starts_at" defaultValue={datetimeValue(campaign?.starts_at)} />
      </label>
      <label className="field">
        <span>上架結束</span>
        <input className="input" type="datetime-local" name="ends_at" defaultValue={datetimeValue(campaign?.ends_at)} />
      </label>
      <label className="field">
        <span>Eyebrow</span>
        <input className="input" name="eyebrow" defaultValue={campaign?.eyebrow || ""} placeholder="專業服務・誠信可靠・用心陪伴" />
      </label>
      <label className="field full">
        <span>標題</span>
        <input className="input" name="title" defaultValue={campaign?.title || ""} required />
      </label>
      <label className="field full">
        <span>副標</span>
        <input className="input" name="subtitle" defaultValue={campaign?.subtitle || ""} />
      </label>
      <label className="field full">
        <span>說明</span>
        <textarea className="textarea" name="body" rows={4} defaultValue={campaign?.body || ""} />
      </label>
      <input type="hidden" name="image_media_id" value={mediaId} />
      <div className="field full">
        <MediaPicker
          assets={mediaAssets}
          preferredUsageTypes={preferredUsageTypes}
          selectedId={mediaId}
          title="Campaign 圖片"
          onSelect={(asset) => {
            setMediaId(asset.id);
            setImageUrl(asset.public_url);
          }}
        />
      </div>
      <label className="field full">
        <span>Fallback 圖片 URL</span>
        <input className="input" name="fallback_image_url" defaultValue={campaign?.fallback_image_url || imageUrl} />
      </label>
      <label className="field full">
        <span>圖片替代文字</span>
        <input className="input" name="image_alt" defaultValue={campaign?.image_alt || ""} />
      </label>
      <label className="field">
        <span>CTA 文字</span>
        <input className="input" name="cta_label" defaultValue={campaign?.cta_label || ""} placeholder="Line 阿勇諮詢" />
      </label>
      <label className="field">
        <span>CTA 連結</span>
        <input className="input" name="cta_href" defaultValue={campaign?.cta_href || ""} placeholder="https://line.me/..." />
      </label>
      <label className="field">
        <span>第二 CTA 文字</span>
        <input className="input" name="secondary_cta_label" defaultValue={campaign?.secondary_cta_label || ""} />
      </label>
      <label className="field">
        <span>第二 CTA 連結</span>
        <input className="input" name="secondary_cta_href" defaultValue={campaign?.secondary_cta_href || ""} />
      </label>
      <div className="actions full">
        <button className="button" type="submit">儲存 Campaign</button>
      </div>
    </form>
  );
}
