"use client";
import { useEffect, useState } from "react";
type Role = "ayong" | "amei" | "duo";
let cache: Partial<Record<Role, string>> | null = null;
let cachedDuoVideo: string | null = null;
export function AssistantPortrait({ role, alt = "", width = 720, height = 665 }: { role: Role; alt?: string; width?: number; height?: number }) {
  const [images, setImages] = useState<Partial<Record<Role,string>>>(cache || {});
  const [duoVideo, setDuoVideo] = useState<string | null>(cachedDuoVideo);
  const [videoFailed, setVideoFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/public/assistant-images", { cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const payload = await response.json() as { images?: Partial<Record<Role, string>>; duoVideo?: string | null };
      if (!payload.images) return;
      cache = payload.images;
      cachedDuoVideo = payload.duoVideo || null;
      if (live) setDuoVideo(cachedDuoVideo);
      if (live) setImages(payload.images);
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  const uploaded = images[role];
  if (role === "duo" && duoVideo && !videoFailed) return <video
    src={duoVideo}
    className="assistant-duo-video"
    width={width} height={height}
    autoPlay muted loop playsInline
    preload="metadata"
    poster={uploaded || "/images/guides/ayong-amei.webp"}
    aria-label={alt || "阿勇阿美雙人找房小助手動畫"}
    onError={() => setVideoFailed(true)}
    style={{ objectFit: "contain", objectPosition: "center" }}
  />;
  return <img className={uploaded && role !== "duo" ? "assistant-portrait-single" : undefined} src={uploaded || "/images/guides/ayong-amei.webp"} alt={alt} width={width} height={height} loading="lazy" decoding="async" style={uploaded ? { objectFit: "contain", objectPosition: "center" } : undefined} />;
}
