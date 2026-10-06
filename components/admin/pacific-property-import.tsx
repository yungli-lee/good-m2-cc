"use client";
import Link from "next/link";
import { useState } from "react";

type Preview = { property: { title: string; address_public: string; layout: string; floor: string; price?: number; rent_monthly?: number; land_area_ping?: number; building_area_ping?: number; transaction_type: string }; imageCount: number; warnings: string[] };
async function callImport(body: Record<string, unknown>) {
  const response = await fetch("/api/admin/properties/pacific-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object" || (response.ok && body.mode === "preview" && (!data.property?.title || !Array.isArray(data.warnings))) || (response.ok && body.mode === "create" && (!data.id || !Number.isInteger(data.imageCount)))) throw new Error("Invalid import response");
  return { response, data };
}
export function PacificPropertyImport() {
  const [url, setUrl] = useState(""); const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [editUrl, setEditUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  async function readSource() {
    setBusy(true); setMessage("正在讀取太平洋公開資料…"); setPreview(null); setEditUrl("");
    try {
      const result = await callImport({ url: url.trim(), mode: "preview" });
      if (!result.response.ok) { setMessage(result.data.error); return; }
      setPreview(result.data); setPreviewUrl(url.trim()); setMessage("請確認下方資料，再建立未上架草稿。");
    } catch { setMessage("連線失敗，請稍後再試。"); } finally { setBusy(false); }
  }
  async function createDraft() {
    setBusy(true); setMessage("正在建立草稿…");
    try {
      const { response, data } = await callImport({ url: previewUrl, mode: "create" });
      if (data.editUrl) setEditUrl(data.editUrl);
      if (!response.ok) { setMessage(data.error); return; }
      let succeeded = 0; const failed: number[] = [];
      for (let index = 0; index < data.imageCount; index++) {
        setMessage(`草稿已建立，正在匯入圖片 ${index + 1}／${data.imageCount}，請保持此頁開啟…`);
        try {
          const result = await callImport({ url: previewUrl, mode: "image", propertyId: data.id, index });
          if (result.response.ok) succeeded++; else failed.push(index + 1);
        } catch { failed.push(index + 1); }
      }
      setMessage(`草稿已建立，已匯入 ${succeeded} 張圖片。${failed.length ? `第 ${failed.join("、")} 張匯入失敗，請在編輯頁補上原檔。` : "請開啟草稿修改資料與照片，確認後再上架。"}${data.warnings?.length ? ` ${data.warnings.join(" ")}` : ""}`);
      setPreview(null);
    } catch { setMessage("連線中斷。如果已建立草稿，請直接開啟草稿；否則先檢查物件列表再重試。"); }
    finally { setBusy(false); }
  }
  return <section className="ai-quick-paste" style={{ marginBottom: 24 }} aria-label="太平洋物件網址匯入">
    <h2>太平洋物件網址匯入</h2>
    <p className="muted">貼上太平洋房屋物件網址，先查看資料，再建立可修改的未上架草稿。圖片會下載至本站。</p>
    <label htmlFor="pacific-url">太平洋物件網址</label>
    <input id="pacific-url" className="input" type="url" value={url} disabled={busy} onChange={event => { setUrl(event.target.value); setPreview(null); }} placeholder="https://www.pacific.com.tw/Object/ObjectDetail/?saleID=S2984754" />
    <div className="actions"><button className="button secondary" type="button" disabled={busy || !url.trim()} onClick={readSource}>讀取物件資料</button></div>
    {preview ? <div className="notice">
      <strong>{preview.property.title}</strong>
      <p>{preview.property.address_public}｜{preview.property.layout}｜{preview.property.floor}</p>
      <p>{preview.property.transaction_type === "rent" ? `月租 ${preview.property.rent_monthly?.toLocaleString() ?? "待補"} 元` : `開價 ${preview.property.price?.toLocaleString() ?? "待補"} 萬`}｜建坪 {preview.property.building_area_ping ?? "待補"}｜地坪 {preview.property.land_area_ping ?? "待補"}｜圖片 {preview.imageCount} 張</p>
      <p>委託期限、底價、屋主資料及開發人員請自行補填；學區與車位權利請確認。</p>
      {preview.warnings.map(warning => <p key={warning}>{warning}</p>)}
      <button className="button" type="button" disabled={busy} onClick={createDraft}>建立草稿並匯入照片</button>
    </div> : null}
    {message ? <p role="status" aria-live="polite">{message}</p> : null}
    {editUrl && !busy ? <Link className="button" href={editUrl}>開啟草稿／原物件修改</Link> : null}
  </section>;
}
