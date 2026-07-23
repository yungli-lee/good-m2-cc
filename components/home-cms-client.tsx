"use client";

import { useEffect, useState } from "react";
import { renderHomeCmsHtml } from "@/lib/home-cms/render";
import type { HomeCampaign, SitePage } from "@/lib/home-cms/types";
import type { CompanySettings } from "@/lib/company-settings";

type HomeCmsPayload = {
  campaigns?: Array<HomeCampaign & { media_public_url?: string | null }>;
  pages?: Array<SitePage & { media_public_url?: string | null }>;
  company?: CompanySettings;
};

export function HomeCmsClient() {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHome() {
      const [staticResponse, cmsResponse] = await Promise.all([
        fetch("/legacy-static/home-body.html"),
        fetch("/api/public/home-cms", { cache: "no-store" })
      ]);
      const staticHtml = staticResponse.ok ? await staticResponse.text() : "";
      const cms = cmsResponse.ok ? ((await cmsResponse.json()) as HomeCmsPayload) : {};
      const nextHtml = renderHomeCmsHtml(staticHtml, cms.campaigns || [], cms.pages || [], cms.company);
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

    let intervalId: number | undefined;
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
      if (slides.length < 2) return;

      let index = 0;
      const show = (next: number) => {
        index = next % slides.length;
        slides.forEach((slide, slideIndex) => {
          slide.hidden = slideIndex !== index;
        });
        dots.forEach((dot, dotIndex) => {
          if (dotIndex === index) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      };
      dots.forEach((dot, dotIndex) => {
        const handler = () => show(dotIndex);
        dotHandlers.push(() => dot.removeEventListener("click", handler));
        dot.addEventListener("click", handler);
      });
      intervalId = window.setInterval(() => show(index + 1), 6500);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (intervalId) window.clearInterval(intervalId);
      dotHandlers.forEach((removeHandler) => removeHandler());
    };
  }, [html]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
