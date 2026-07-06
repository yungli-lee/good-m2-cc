"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import type { HomeCampaign } from "@/lib/home-cms/types";
import { cmsStatusLabels } from "@/lib/home-cms/types";
import type { MediaLibraryAsset, MediaUsageType } from "@/lib/media";

type Props = {
  campaign?: HomeCampaign | null;
  mediaAssets: MediaLibraryAsset[];
};

type SaveResponse = {
  ok?: boolean;
  message?: string;
  redirectTo?: string;
};

const preferredUsageTypes: MediaUsageType[] = ["hero_banner", "general", "knowledge_hero"];

function datetimeValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export function HomeCampaignForm({ campaign, mediaAssets }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const initialAsset = mediaAssets.find((asset) => asset.id === campaign?.image_media_id) || null;
  const [mediaId, setMediaId] = useState(initialAsset?.id || "");
  const [imageUrl, setImageUrl] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setToast(null);
    const endpoint = campaign?.id ? `/api/admin/home-campaigns/${campaign.id}` : "/api/admin/home-campaigns";
    const method = campaign?.id ? "PATCH" : "POST";
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const response = await fetch(endpoint, { method, body: formData });
        const result = (await response.json().catch(() => null)) as SaveResponse | null;
        if (!response.ok || !result?.ok) {
          setError(result?.message || "儲存失敗，請稍後再試。");
          return;
        }

        setToast(result.message || "Campaign 已儲存。");
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
        <span>狀態</span>
        <select className="select" name="status" defaultValue={campaign?.status || "draft"} disabled={pending}>
          {Object.entries(cmsStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>排序</span>
        <input className="input" type="number" min="0" name="sort_order" defaultValue={campaign?.sort_order ?? 1000} disabled={pending} />
      </label>
      <label className="field">
        <span>上架開始</span>
        <input className="input" type="datetime-local" name="starts_at" defaultValue={datetimeValue(campaign?.starts_at)} disabled={pending} />
      </label>
      <label className="field">
        <span>上架結束</span>
        <input className="input" type="datetime-local" name="ends_at" defaultValue={datetimeValue(campaign?.ends_at)} disabled={pending} />
      </label>
      <label className="field">
        <span>Eyebrow</span>
        <input className="input" name="eyebrow" defaultValue={campaign?.eyebrow || ""} placeholder="專業服務・誠信可靠・用心陪伴" disabled={pending} />
      </label>
      <label className="field full">
        <span>標題</span>
        <input className="input" name="title" defaultValue={campaign?.title || ""} required disabled={pending} />
      </label>
      <label className="field full">
        <span>副標</span>
        <input className="input" name="subtitle" defaultValue={campaign?.subtitle || ""} disabled={pending} />
      </label>
      <label className="field full">
        <span>說明</span>
        <textarea className="textarea" name="body" rows={4} defaultValue={campaign?.body || ""} disabled={pending} />
      </label>
      <input type="hidden" name="image_media_id" value={mediaId} />
      <div className="field full">
        <MediaPicker
          assets={mediaAssets}
          preferredUsageTypes={preferredUsageTypes}
          selectedId={mediaId}
          title="Campaign 圖片"
          disabled={pending}
          onSelect={(asset) => {
            setMediaId(asset.id);
            setImageUrl(asset.public_url);
          }}
        />
      </div>
      <label className="field full">
        <span>Fallback 圖片 URL</span>
        <input className="input" name="fallback_image_url" defaultValue={campaign?.fallback_image_url || imageUrl} disabled={pending} />
      </label>
      <label className="field full">
        <span>圖片替代文字</span>
        <input className="input" name="image_alt" defaultValue={campaign?.image_alt || ""} disabled={pending} />
      </label>
      <label className="field">
        <span>CTA 文字</span>
        <input className="input" name="cta_label" defaultValue={campaign?.cta_label || ""} placeholder="Line 阿勇諮詢" disabled={pending} />
      </label>
      <label className="field">
        <span>CTA 連結</span>
        <input className="input" name="cta_href" defaultValue={campaign?.cta_href || ""} placeholder="https://line.me/..." disabled={pending} />
      </label>
      <label className="field">
        <span>第二 CTA 文字</span>
        <input className="input" name="secondary_cta_label" defaultValue={campaign?.secondary_cta_label || ""} disabled={pending} />
      </label>
      <label className="field">
        <span>第二 CTA 連結</span>
        <input className="input" name="secondary_cta_href" defaultValue={campaign?.secondary_cta_href || ""} disabled={pending} />
      </label>
      <div className="actions full">
        <button className="button" type="submit" disabled={pending}>{pending ? "儲存中..." : "儲存 Campaign"}</button>
      </div>
    </form>
  );
}
