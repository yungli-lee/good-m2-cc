"use client";
import { useEffect, useState } from "react";
type Role = "ayong" | "amei";
let cache: Partial<Record<Role, string>> | null = null;
export function AssistantPortrait({ role, alt = "", width = 720, height = 665 }: { role: Role; alt?: string; width?: number; height?: number }) {
  const [images, setImages] = useState<Partial<Record<Role,string>>>(cache || {});
  useEffect(() => {
    let live = true;
    fetch("/api/public/assistant-images", { cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const payload = await response.json() as { images?: Partial<Record<Role, string>> };
      if (!payload.images) return;
      cache = payload.images;
      if (live) setImages(payload.images);
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  const uploaded = images[role];
  return <img src={uploaded || "/images/guides/ayong-amei.webp"} alt={alt} width={width} height={height} loading="lazy" decoding="async" style={uploaded ? { objectFit: "contain", objectPosition: "center" } : undefined} />;
}
