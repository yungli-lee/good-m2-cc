"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertyMedia } from "@/lib/properties/types";

export function PacificPhotoImport({ propertyId, sourceText, media }: { propertyId: string; sourceText: string; media: PropertyMedia[] }) {
  const router = useRouter();
  const savedUrl = sourceText.match(/https:\/\/www\.pacific\.com\.tw\/[^\s；]+/)?.[0] || "";
  const [url, setUrl] = useState(savedUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [imported, setImported] = useState<string[]>([]);

  async function importPhotos() {
    setBusy(true);
    setMessage("正在讀取來源照片…");
    let added = 0;
    let skipped = 0;
    let failed = 0;
    const completed: string[] = [];
    try {
      const response = await fetch("/api/admin/import-property-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "無法讀取來源網址");
      const photos: Array<{ url: string; name: string; label: string }> = payload.data.photos || [];
      if (!photos.length) throw new Error(payload.data.photoWarning || "來源網址沒有可匯入的照片");
      for (const [index, photo] of photos.entries()) {
        const stem = photo.name.replace(/\.[^.]+$/, "");
        if (imported.includes(photo.name) || media.some((item) => item.alt_text === `太平洋 ${photo.name}` || item.storage_path?.includes(stem + "-"))) { skipped++; continue; }
        setMessage(`正在匯入照片 ${index + 1}／${photos.length}…`);
        try {
          const image = await fetch("/api/admin/import-property-photo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: photo.url }), signal: AbortSignal.timeout(20000) });
          if (!image.ok) throw new Error("下載失敗");
          const blob = await image.blob();
          const form = new FormData();
          form.set("property_id", propertyId);
          form.set("alt_text", `太平洋 ${photo.name}`);
          form.set("file", new File([blob], photo.name, { type: blob.type }));
          const upload = await fetch("/api/admin/uploads/property-image", { method: "POST", body: form });
          if (!upload.ok) throw new Error("儲存失敗");
          completed.push(photo.name);
          added++;
        } catch { failed++; }
      }
      setMessage(`已追加並儲存 ${added} 張照片。${skipped ? `跳過 ${skipped} 張已匯入照片。` : ""}${failed ? `${failed} 張失敗，請再次點擊匯入重試。` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "照片匯入失敗");
    } finally {
      setImported((current) => [...current, ...completed]);
      setBusy(false);
      if (added) router.refresh();
    }
  }

  return <div style={{ marginBottom: 18 }}>
    {!savedUrl ? <div className="field"><label htmlFor="photo-source-url">太平洋來源網址</label><input id="photo-source-url" className="input" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="貼上太平洋物件網址" /></div> : null}
    <button type="button" className="button secondary" disabled={busy || !url.trim()} onClick={importPhotos}>{busy ? "照片匯入中…" : "📷 匯入照片"}</button>
    <p className="muted">使用{savedUrl ? "內部備註保留的" : "上方"}來源網址，將照片與格局圖追加並儲存到此物件。</p>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
