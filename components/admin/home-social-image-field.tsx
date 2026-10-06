"use client";

import { useRef, useState } from "react";
import { processHomeSocialImage, validateHomeSocialSource } from "@/lib/home-social-client";
import { absoluteHomeSocialFallback } from "@/lib/home-social-image";

export function HomeSocialImageField({ initialUrl, initialPath }: { initialUrl: string | null; initialPath: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl || absoluteHomeSocialFallback());
  const [path, setPath] = useState(initialPath || "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function choose(file?: File) {
    if (!file) return;
    const validation = validateHomeSocialSource(file);
    if (validation) { setStatus(validation); return; }
    setBusy(true);
    setStatus("正在裁切、轉換並上傳…");
    try {
      const processed = await processHomeSocialImage(file);
      const body = new FormData();
      body.set("file", processed);
      const response = await fetch("/api/admin/home-social-image", { method: "POST", body });
      const payload = await response.json() as { data?: { url: string; path: string }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "上傳失敗。");
      setUrl(payload.data.url);
      setPath(payload.data.path);
      setStatus("圖片已上傳並預覽；請按下頁面底部的「儲存／發布」才會正式套用。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "圖片處理或上傳失敗。");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return <section className="field full" aria-labelledby="home-social-title">
    <h2 id="home-social-title">首頁社群分享圖片</h2>
    <p className="muted">建議 1200×630 px、橫式約 1.91:1；支援 JPEG、PNG、WebP，最大 5MB。上傳時會自動依 EXIF 方向校正、等比例置中裁切並輸出 RGB JPEG。</p>
    <img src={url} alt="目前首頁社群分享圖片預覽" style={{ display: "block", width: "100%", maxWidth: 600, aspectRatio: "1200 / 630", objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }} />
    <input type="hidden" name="home_social_image_url" value={path ? url : ""} />
    <input type="hidden" name="home_social_image_path" value={path} />
    <input ref={inputRef} className="input" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void choose(event.target.files?.[0])} />
    {status ? <div className="notice" role="status">{status}</div> : null}
  </section>;
}
