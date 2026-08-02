"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { VideoLightbox } from "@/components/media/video-lightbox";
import { activateHomeCarouselVideo, deactivateHomeCarouselVideo } from "@/lib/media/home-carousel-video";
import { homeSlideDurationMs } from "@/lib/media/playback";
import { renderHomeCmsHtml } from "@/lib/home-cms/render";
import type { HomeCampaign, SitePage } from "@/lib/home-cms/types";
import type { CompanySettings } from "@/lib/company-settings";
import type { ResolvedNavigationItem } from "@/lib/navigation";

type HomeCmsPayload = {
  campaigns?: Array<HomeCampaign & { media_public_url?: string | null }>;
  pages?: Array<SitePage & { media_public_url?: string | null }>;
  company?: CompanySettings;
  navigation?: ResolvedNavigationItem[];
};

const HomeCmsMarkup = memo(function HomeCmsMarkup({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
});

export function HomeCmsClient() {
  const [html, setHtml] = useState("");
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);
  const closeLightbox = useCallback(() => {
    setLightbox(null);
    window.dispatchEvent(new Event("home-video-lightbox-close"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHome() {
      const [staticResponse, cmsResponse] = await Promise.all([
        fetch("/legacy-static/home-body.html"),
        fetch("/api/public/home-cms", { cache: "no-store" })
      ]);
      const staticHtml = staticResponse.ok ? await staticResponse.text() : "";
      const cms = cmsResponse.ok ? ((await cmsResponse.json()) as HomeCmsPayload) : {};
      const nextHtml = renderHomeCmsHtml(staticHtml, cms.campaigns || [], cms.pages || [], cms.company, cms.navigation || []);
      if (!cancelled) setHtml(nextHtml);
    }

    loadHome().catch(() => {
      if (!cancelled) setHtml("");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!html) return;

    let timeoutId: number | undefined;
    const dotHandlers: Array<() => void> = [];

    const timer = window.setTimeout(() => {
      document.querySelector('script[data-home-legacy-script="true"]')?.remove();
      const script = document.createElement("script");
      script.src = "/legacy-static/script.js";
      script.async = true;
      script.dataset.homeLegacyScript = "true";
      document.body.appendChild(script);

      const root = document.querySelector("[data-home-campaign-carousel]");
      if (!root) return;
      const slides = Array.from(root.querySelectorAll<HTMLElement>("[data-home-campaign-slide]"));
      const dots = Array.from(root.querySelectorAll<HTMLElement>("[data-home-campaign-dot]"));
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let index = 0;
      let paused = false;
      let videoFailed = false;
      const failActiveVideo = (slide: HTMLElement, video: HTMLVideoElement, slideIndex: number) => {
        if (slideIndex !== index) return;
        videoFailed = true;
        video.pause();
        video.hidden = true;
        const fallback = slide.querySelector<HTMLElement>("[data-home-video-fallback]");
        if (fallback) fallback.hidden = false;
        schedule();
      };
      const schedule = () => {
        if (paused || reducedMotion || slides.length < 2) return;
        window.clearTimeout(timeoutId);
        const activeVideo = slides[index]?.querySelector<HTMLVideoElement>("[data-home-campaign-video]");
        const imageDuration = Number(slides[index]?.dataset.slideDurationSeconds || 5);
        timeoutId = window.setTimeout(() => show(index + 1), videoFailed ? 5_000 : homeSlideDurationMs(activeVideo ? "video" : "image", imageDuration));
      };
      const show = (next: number) => {
        window.clearTimeout(timeoutId);
        index = next % slides.length;
        videoFailed = false;
        slides.forEach((slide, slideIndex) => {
          slide.hidden = slideIndex !== index;
          const video = slide.querySelector<HTMLVideoElement>("[data-home-campaign-video]");
          if (!video) return;
          if (slideIndex === index) {
            const fallback = slide.querySelector<HTMLElement>("[data-home-video-fallback]");
            if (fallback) fallback.hidden = true;
            activateHomeCarouselVideo(video, {
              reducedMotion,
              onPlayRejected: () => failActiveVideo(slide, video, slideIndex)
            });
          } else {
            deactivateHomeCarouselVideo(video);
          }
        });
        dots.forEach((dot, dotIndex) => {
          if (dotIndex === index) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
        schedule();
      };
      dots.forEach((dot, dotIndex) => {
        const handler = () => show(dotIndex);
        dotHandlers.push(() => dot.removeEventListener("click", handler));
        dot.addEventListener("click", handler);
      });
      const fullButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-video-lightbox-src]"));
      slides.forEach((slide, slideIndex) => {
        const video = slide.querySelector<HTMLVideoElement>("[data-home-campaign-video]");
        if (!video) return;
        const handler = () => {
          if (!paused && slideIndex === index && slides.length > 1) show(index + 1);
        };
        video.addEventListener("ended", handler);
        dotHandlers.push(() => video.removeEventListener("ended", handler));
        const failureHandler = () => {
          failActiveVideo(slide, video, slideIndex);
        };
        const fallbackImage = slide.querySelector<HTMLImageElement>("[data-home-video-fallback] img");
        const posterFailureHandler = () => {
          if (fallbackImage) fallbackImage.hidden = true;
        };
        fallbackImage?.addEventListener("error", posterFailureHandler);
        ["error", "stalled", "abort"].forEach((eventName) => video.addEventListener(eventName, failureHandler));
        dotHandlers.push(() => ["error", "stalled", "abort"].forEach((eventName) => video.removeEventListener(eventName, failureHandler)));
        dotHandlers.push(() => fallbackImage?.removeEventListener("error", posterFailureHandler));
      });
      fullButtons.forEach((button) => {
        const handler = () => {
          paused = true;
          window.clearTimeout(timeoutId);
          const backgroundVideo = slides[index]?.querySelector<HTMLVideoElement>("[data-home-campaign-video]");
          if (backgroundVideo) deactivateHomeCarouselVideo(backgroundVideo);
          setLightbox({ src: button.dataset.videoLightboxSrc || "", title: button.dataset.videoLightboxTitle || "完整影片" });
        };
        button.addEventListener("click", handler);
        dotHandlers.push(() => button.removeEventListener("click", handler));
      });
      const resume = () => {
        paused = false;
        show(index);
      };
      window.addEventListener("home-video-lightbox-close", resume);
      dotHandlers.push(() => window.removeEventListener("home-video-lightbox-close", resume));
      const resumeVisibleVideo = () => {
        if (document.visibilityState === "visible" && !paused) show(index);
      };
      document.addEventListener("visibilitychange", resumeVisibleVideo);
      dotHandlers.push(() => document.removeEventListener("visibilitychange", resumeVisibleVideo));
      show(0);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (timeoutId) window.clearTimeout(timeoutId);
      document.querySelectorAll<HTMLVideoElement>("[data-home-campaign-video]").forEach(deactivateHomeCarouselVideo);
      dotHandlers.forEach((removeHandler) => removeHandler());
    };
  }, [html]);

  return <>
    <HomeCmsMarkup html={html} />
    <VideoLightbox open={Boolean(lightbox)} src={lightbox?.src || ""} title={lightbox?.title} onClose={closeLightbox} />
  </>;
}
