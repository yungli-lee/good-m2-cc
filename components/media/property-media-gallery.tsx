"use client";

import { useCallback, useState } from "react";
import type { PropertyMedia } from "@/lib/properties/types";
import { resolvePropertyGallery } from "@/lib/properties/media-gallery";
import { ImageLightbox } from "@/components/media/image-lightbox";
import { VideoLightbox } from "@/components/media/video-lightbox";
import { trackEvent } from "@/lib/analytics/client";

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

export function PropertyMediaGallery({ media, title, propertyId }: { media: PropertyMedia[]; title: string; propertyId: string }) {
  const { images, cover, detailMedia } = resolvePropertyGallery(media);
  const [activeVideo, setActiveVideo] = useState<PropertyMedia | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const closeVideo = useCallback(() => setActiveVideo(null), []);
  const closeImage = useCallback(() => setActiveImageIndex(null), []);
  const changeImage = useCallback((index: number) => setActiveImageIndex(index), []);

  const openImage = (item: PropertyMedia) => {
    const imageIndex = images.indexOf(item);
    if (imageIndex < 0) return;
    setActiveImageIndex(imageIndex);
    void trackEvent("view_property_media", { propertyId, properties: { media_type: "image", media_index: media.indexOf(item), action: "view" } });
  };

  return (
    <div className="gallery">
      {cover ? (
        <button className="gallery-main-button" type="button" onClick={() => openImage(cover)} aria-label={`放大照片：${cover.alt_text || title}`}>
          <img className="gallery-main" src={cover.url} alt={cover.alt_text || title} />
        </button>
      ) : <div className="gallery-main" role="img" aria-label={`${title} 尚未設定封面照片`} />}
      {detailMedia.length ? <div className="media-grid">
        {detailMedia.map((item) => item.media_type === "video" ? (
          <PropertyVideoPoster key={item.id} item={item} title={title} onPlay={() => {
            setActiveVideo(item);
            void trackEvent("view_property_media", { propertyId, properties: { media_type: "video", media_index: media.indexOf(item), action: "play" } });
          }} />
        ) : (
          <button key={item.id} className="property-image-button" type="button" onClick={() => openImage(item)} aria-label={`放大照片：${item.alt_text || title}`}>
            <img className="property-image" src={item.url} alt={item.alt_text || title} loading="lazy" />
          </button>
        ))}
      </div> : null}
      <ImageLightbox images={images} activeIndex={activeImageIndex} title={title} onChange={changeImage} onClose={closeImage} />
      <VideoLightbox open={Boolean(activeVideo)} src={activeVideo?.url || ""} poster={activeVideo?.thumbnail_url} title={activeVideo?.alt_text || title} onClose={closeVideo} />
    </div>
  );
}
