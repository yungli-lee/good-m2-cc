"use client";

import { useState } from "react";

export function PropertyCoverImage({ src, alt, className, fallbackClassName = className }: { src: string; alt: string; className: string; fallbackClassName?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <div className={fallbackClassName} role="img" aria-label={`${alt} 封面暫時無法顯示`} />;
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
