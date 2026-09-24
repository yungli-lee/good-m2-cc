"use client";

import { useEffect, useRef, useState } from "react";
import { DeliveredImage } from "@/components/media/delivered-image";

// Match the 1120px container, 24px gap and 1.4fr / min(300px, .6fr)
// desktop columns. Both mounted layouts intentionally share these sizes so
// their cover uses the same URL at a given viewport.
export const propertyDetailCoverSizes = "(max-width: 760px) calc(100vw - 32px), (max-width: 1056px) calc(100vw - 356px), (max-width: 1152px) calc(70vw - 39.2px), 767.2px";
export const propertyDetailGridSizes = "(max-width: 760px) calc(100vw - 32px), (max-width: 1056px) calc(25vw - 98px), (max-width: 1152px) calc(17.5vw - 18.8px), 182.8px";
export const propertyFullscreenSizes = "(max-width: 640px) calc(100vw - 24px), (max-width: 1248px) calc(100vw - 48px), 1200px";

export function PropertyDetailImage({ sourceUrl, alt, main = false }: { sourceUrl: string; alt: string; main?: boolean }) {
  const placeholder = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(main);

  useEffect(() => {
    if (visible) return;
    const element = placeholder.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    // Native lazy loading can fetch several screens ahead. Keep distant and
    // display:none gallery copies source-free until this slot enters the view.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  const className = main ? "gallery-main" : "property-image";
  return visible ? (
    <DeliveredImage sourceUrl={sourceUrl} tier="detail" sizes={main ? propertyDetailCoverSizes : propertyDetailGridSizes}
      className={className} alt={alt} loading={main ? "eager" : "lazy"} decoding="async" />
  ) : <span ref={placeholder} className={className} aria-hidden="true" data-deferred-image />;
}
