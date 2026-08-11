"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VideoLightbox } from "@/components/media/video-lightbox";
import { activateHomeCarouselVideo, deactivateHomeCarouselVideo } from "@/lib/media/home-carousel-video";
import { homeSlideDurationMs } from "@/lib/media/playback";
import { normalizeHeroOverlayStrength } from "@/lib/home-cms/hero-overlay";
import type { HomeCampaign } from "@/lib/home-cms/types";

type Campaign = HomeCampaign & { media_public_url?: string | null };

export function HomeCampaignCarousel({ campaigns }: { campaigns: Campaign[] }) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [lightbox, setLightbox] = useState<Campaign | null>(null);
  const videos = useRef<Array<HTMLVideoElement | null>>([]);
  const timer = useRef<number | null>(null);
  const reducedMotion = useRef(false);
  const clearTimer = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const advance = useCallback(() => setActive((index) => (index + 1) % Math.max(campaigns.length, 1)), [campaigns.length]);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    clearTimer();
    videos.current.forEach((video, index) => {
      if (!video) return;
      if (index !== active || lightbox) deactivateHomeCarouselVideo(video);
      else activateHomeCarouselVideo(video, {
        reducedMotion: reducedMotion.current,
        onPlayRejected: () => setFailed((current) => ({ ...current, [index]: true }))
      });
    });
    if (lightbox || reducedMotion.current || campaigns.length < 2) return clearTimer;
    const campaign = campaigns[active];
    const isVideo = campaign?.media_assets?.media_type === "video";
    timer.current = window.setTimeout(advance, failed[active] ? 5_000 : homeSlideDurationMs(isVideo ? "video" : "image", campaign?.slide_duration_seconds || 5));
    return clearTimer;
  }, [active, advance, campaigns, clearTimer, failed, lightbox]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setActive((index) => index);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const closeLightbox = useCallback(() => setLightbox(null), []);
  if (!campaigns.length) return null;

  return (
    <>
      <section className="hero home-campaign-carousel" data-home-campaign-carousel data-react-managed-carousel>
        {campaigns.map((campaign, index) => {
          const src = campaign.media_public_url || campaign.fallback_image_url || "/assets/hero-ayong-wu-laptop.jpeg";
          const alt = campaign.image_alt || campaign.media_assets?.alt_text || campaign.title;
          const video = campaign.media_assets?.media_type === "video";
          const poster = campaign.media_assets?.poster_url || "";
          return <div className={`home-campaign-slide${video ? " home-campaign-video-slide" : ""}`} hidden={index !== active} data-home-campaign-slide data-overlay-strength={normalizeHeroOverlayStrength(campaign.overlay_strength)} data-slide-duration-seconds={campaign.slide_duration_seconds || 5} key={campaign.id}>
            <div className="hero-media">
              {video && !failed[index] ? <video
                ref={(element) => { videos.current[index] = element; }}
                data-video-src={src}
                poster={poster}
                aria-label={alt}
                muted
                playsInline
                preload={index === active ? "metadata" : "none"}
                data-home-campaign-video
                onEnded={advance}
                onError={() => setFailed((current) => ({ ...current, [index]: true }))}
                onStalled={() => setFailed((current) => ({ ...current, [index]: true }))}
                onAbort={() => setFailed((current) => ({ ...current, [index]: true }))}
              /> : video ? <div className="home-video-fallback"><img src={poster} alt={alt} onError={(event) => { event.currentTarget.hidden = true; }} /><span>影片暫時無法播放</span></div> : <img src={src} alt={alt} />}
              {video ? <button className="home-video-full-button" type="button" onClick={() => setLightbox(campaign)}>▶ 播放完整版</button> : null}
            </div>
            <div className="hero-copy">
              {campaign.eyebrow ? <p className="eyebrow">{campaign.eyebrow}</p> : null}
              <h1>{campaign.title}</h1>
              {campaign.subtitle ? <p>{campaign.subtitle}</p> : null}
              {campaign.body ? <p>{campaign.body}</p> : null}
              <div className="hero-actions">
                <a className="button primary" href={campaign.cta_href || "https://line.me/ti/p/abQv5LYzzE"}>{campaign.cta_label || "Line 阿勇諮詢"}</a>
                {campaign.secondary_cta_label && campaign.secondary_cta_href ? <a className="button" href={campaign.secondary_cta_href}>{campaign.secondary_cta_label}</a> : null}
              </div>
            </div>
          </div>;
        })}
        {campaigns.length > 1 ? <div className="home-campaign-controls" aria-label="首頁檔期切換">{campaigns.map((campaign, index) => <button type="button" aria-label={`切換到 ${campaign.title}`} aria-current={index === active ? "true" : undefined} onClick={() => { setFailed((current) => ({ ...current, [index]: false })); setActive(index); }} key={campaign.id} />)}</div> : null}
      </section>
      <VideoLightbox open={Boolean(lightbox)} src={lightbox?.media_public_url || lightbox?.fallback_image_url || ""} poster={lightbox?.media_assets?.poster_url} title={lightbox?.image_alt || lightbox?.title} onClose={closeLightbox} />
    </>
  );
}
