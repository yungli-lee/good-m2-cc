"use client";

import { useCallback, useState } from "react";
import type { PropertyMedia } from "@/lib/properties/types";
import { VideoLightbox } from "@/components/media/video-lightbox";

function PropertyVideoPoster({ item, title, onPlay }: { item: PropertyMedia; title: string; onPlay: () => void }) {
  const [posterFailed, setPosterFailed] = useState(false);
  return (
    <button className="property-video-card" type="button" onClick={onPlay} aria-label={`播放完整版：${item.alt_text || title}`}>
      {posterFailed || !item.thumbnail_url
        ? <span className="property-video-fallback">影片無法播放</span>
        : <img src={item.thumbnail_url} alt={item.alt_text || `${title} 影片 Poster`} loading="lazy" onError={() => setPosterFailed(true)} />}
      <span>▶ 播放完整版</span>
    </button>
  );
}

export function PropertyMediaGallery({ media, title }: { media: PropertyMedia[]; title: string }) {
  const images = media.filter((item) => item.media_type === "image" && !item.deleted_at);
  const cover = images.find((item) => item.is_cover) || images[0] || null;
  const [activeVideo, setActiveVideo] = useState<PropertyMedia | null>(null);
  const close = useCallback(() => setActiveVideo(null), []);

  return (
    <div className="gallery">
      {cover ? <img className="gallery-main" src={cover.url} alt={cover.alt_text || title} /> : <div className="gallery-main" role="img" aria-label={`${title} 尚未設定封面照片`} />}
      <div className="media-grid">
        {media.filter((item) => !item.deleted_at).map((item) => item.media_type === "video" ? (
          <PropertyVideoPoster key={item.id} item={item} title={title} onPlay={() => setActiveVideo(item)} />
        ) : (
          <img key={item.id} className="property-image" src={item.url} alt={item.alt_text || title} loading="lazy" />
        ))}
      </div>
      <VideoLightbox open={Boolean(activeVideo)} src={activeVideo?.url || ""} poster={activeVideo?.thumbnail_url} title={activeVideo?.alt_text || title} onClose={close} />
    </div>
  );
}
