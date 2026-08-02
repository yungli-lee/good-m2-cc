"use client";

import { useMemo, useState } from "react";
import { mediaCategoryLabels, mediaUsageTypeLabels } from "@/lib/media";
import { mediaCategoryUsageTypes, type MediaCategoryFilter } from "@/lib/media/schema";
import type { MediaLibraryAsset, MediaType, MediaUsageType } from "@/lib/media";

type Props = {
  assets: MediaLibraryAsset[];
  disabled?: boolean;
  preferredUsageTypes?: MediaUsageType[];
  selectedId?: string;
  title: string;
  emptyText?: string;
  onSelect: (asset: MediaLibraryAsset) => void;
  allowedMediaTypes?: MediaType[];
};

const categoryValues: MediaCategoryFilter[] = ["all", "knowledge", "property", "company", "hero", "general"];

function assetName(asset: MediaLibraryAsset) {
  return asset.alt_text || asset.original_filename || asset.id;
}

function matchesCategory(asset: MediaLibraryAsset, category: MediaCategoryFilter) {
  if (category === "all") return true;
  return mediaCategoryUsageTypes[category].includes(asset.usage_type);
}

function matchesSearch(asset: MediaLibraryAsset, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [
    asset.original_filename,
    asset.alt_text,
    asset.caption,
    asset.usage_type,
    mediaUsageTypeLabels[asset.usage_type]
  ].some((value) => String(value || "").toLowerCase().includes(term));
}

export function MediaPicker({
  assets,
  disabled = false,
  emptyText = "目前沒有可選圖片。",
  preferredUsageTypes = [],
  selectedId,
  title,
  onSelect,
  allowedMediaTypes = ["image"]
}: Props) {
  const [category, setCategory] = useState<MediaCategoryFilter>("all");
  const [query, setQuery] = useState("");
  const preferred = useMemo(() => new Set(preferredUsageTypes), [preferredUsageTypes]);
  const sortedAssets = useMemo(
    () => assets.filter((asset) => allowedMediaTypes.includes(asset.media_type)).sort((a, b) => Number(preferred.has(b.usage_type)) - Number(preferred.has(a.usage_type))),
    [allowedMediaTypes, assets, preferred]
  );
  const filteredAssets = sortedAssets.filter((asset) => matchesCategory(asset, category) && matchesSearch(asset, query));
  const selectedAsset = sortedAssets.find((asset) => asset.id === selectedId) || filteredAssets[0] || sortedAssets[0] || null;

  return (
    <div className="media-picker">
      <div className="media-picker-header">
        <strong>{title}</strong>
        <span className="muted">{filteredAssets.length} 個媒體</span>
      </div>
      <div className="media-picker-controls">
        <label className="field">
          <span>分類</span>
          <select className="select" value={category} onChange={(event) => setCategory(event.target.value as MediaCategoryFilter)} disabled={disabled}>
            {categoryValues.map((value) => (
              <option key={value} value={value}>{mediaCategoryLabels[value]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>搜尋</span>
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋檔名、ALT、說明或用途" disabled={disabled} />
        </label>
      </div>

      <div className="media-picker-layout">
        <div className="media-picker-grid" aria-label={title}>
          {filteredAssets.map((asset) => {
            const isSelected = selectedId === asset.id;
            return (
              <button
                className={`media-picker-card${isSelected ? " is-selected" : ""}`}
                disabled={disabled}
                key={asset.id}
                onClick={() => onSelect(asset)}
                type="button"
              >
                {asset.media_type === "video"
                  ? asset.poster_url
                    ? <img src={asset.poster_url} alt={asset.alt_text || asset.original_filename || "影片 Poster"} loading="lazy" />
                    : <span className="property-video-fallback">影片無法播放</span>
                  : <img src={asset.public_url} alt={asset.alt_text || asset.original_filename || "媒體圖片"} loading="lazy" />}
                <span>
                  <strong>{assetName(asset)}</strong>
                  <em>{mediaUsageTypeLabels[asset.usage_type]}</em>
                </span>
              </button>
            );
          })}
          {!filteredAssets.length ? <div className="media-picker-empty">{emptyText}</div> : null}
        </div>

        <aside className="media-picker-preview" aria-label={`${title}預覽`}>
          {selectedAsset ? (
            <>
              {selectedAsset.media_type === "video"
                ? <video src={selectedAsset.public_url} controls playsInline preload="metadata" />
                : <img src={selectedAsset.public_url} alt={selectedAsset.alt_text || selectedAsset.original_filename || "媒體預覽"} loading="lazy" />}
              <dl>
                <div>
                  <dt>ALT</dt>
                  <dd>{selectedAsset.alt_text || "-"}</dd>
                </div>
                <div>
                  <dt>Caption</dt>
                  <dd>{selectedAsset.caption || "-"}</dd>
                </div>
                <div>
                  <dt>用途</dt>
                  <dd>{mediaUsageTypeLabels[selectedAsset.usage_type]}</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="media-picker-empty">{emptyText}</div>
          )}
        </aside>
      </div>
    </div>
  );
}
