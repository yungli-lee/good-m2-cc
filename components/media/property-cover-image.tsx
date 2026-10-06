"use client";

import { useState } from "react";
import { DeliveredImage } from "@/components/media/delivered-image";

export function PropertyCoverImage({ src, alt, className, fallbackClassName = className, sizes }: { src: string; alt: string; className: string; fallbackClassName?: string; sizes?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <div className={fallbackClassName} role="img" aria-label={`${alt} 封面暫時無法顯示`} />;
  // Public card callers opt in; admin previews retain their existing delivery.
  if (sizes) return <DeliveredImage className={className} sourceUrl={src} tier="property-card" sizes={sizes} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
