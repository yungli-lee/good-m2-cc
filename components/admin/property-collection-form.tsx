"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CollectionShare } from "@/components/properties/collection-share";
import { PropertyCard } from "@/components/properties/property-card";
import { processHomeSocialImage, validateHomeSocialSource } from "@/lib/home-social-client";
import { collectionDistricts, collectionTypes } from "@/lib/properties/collection-link";
import { collectionStatusLabels, propertyCollectionHref, type PropertyCollection } from "@/lib/property-collections/core";
import type { Property } from "@/lib/properties/types";

type Preview = { data: Property[]; title: string; description: string; cover_storage_path: string };
export function PropertyCollectionForm({ collection, coverUrl, fallbackImage, origin }: { collection?: PropertyCollection; coverUrl?: string | null; fallbackImage: string; origin: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const previewController = useRef<AbortController | null>(null);
  const [path, setPath] = useState(collection?.cover_storage_path || "");
  const [image, setImage] = useState(coverUrl || fallbackImage);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  function invalidate() {
    previewController.current?.abort();
    setPreviewing(false);
    setPreview(null);
  }
  async function upload(file?: File) {
    if (!file) return;
    const invalid = validateHomeSocialSource(file);
    if (invalid) { setError(invalid); return; }
    invalidate(); setUploading(true); setError(""); setMessage("正在處理並上傳封面…");
    try {
      const body = new FormData(); body.set("file", await processHomeSocialImage(file));
      const response = await fetch("/api/admin/property-collections/cover", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.data) throw new Error(result.error || "封面上傳失敗。");
      setPath(result.data.path); setImage(result.data.url);
      setMessage("封面已上傳，儲存主題後套用。");
    } catch (e) { setMessage(""); setError(e instanceof Error ? e.message : "封面上傳失敗。"); }
    finally { setUploading(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || saving) return;
    invalidate(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(collection ? `/api/admin/property-collections/${collection.id}` : "/api/admin/property-collections", { method: collection ? "PATCH" : "POST", body: new FormData(event.currentTarget) });
      const result = await response.json();
      if (!response.ok || !result.data) throw new Error(result.error || "儲存失敗。");
      router.push(result.redirectTo); router.refresh();
      setMessage("主題已儲存。");
    } catch (e) { setError(e instanceof Error ? e.message : "儲存失敗。"); }
    finally { setSaving(false); }
  }
  async function showPreview() {
    if (!formRef.current || uploading || saving) return;
    invalidate(); setError(""); setPreviewing(true);
    const controller = new AbortController(); previewController.current = controller;
    try {
      const response = await fetch("/api/admin/property-collections/preview", { method: "POST", body: new FormData(formRef.current), signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !result.data) throw new Error(result.error || "預覽失敗。");
      if (!controller.signal.aborted) setPreview(result);
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "預覽失敗。"); }
    finally { if (!controller.signal.aborted) setPreviewing(false); }
  }
  return <>
    <form ref={formRef} onSubmit={save} onChange={invalidate} className="card collection-editor">
      <fieldset disabled={saving} className="collection-editor-fields">
        <div className="form-grid">
          <div className="field full"><label htmlFor="collection-title">主題標題</label><input id="collection-title" className="input" name="title" required maxLength={100} defaultValue={collection?.title} placeholder="鹿港・福興・秀水｜2000萬內精選" /></div>
          <div className="field full"><label htmlFor="collection-description">主題介紹／社群預覽說明</label><textarea id="collection-description" className="textarea" name="description" rows={3} maxLength={500} defaultValue={collection?.description} placeholder="一次比較合適的物件，阿勇與阿美可以為你詳細介紹。" /></div>
          <div className="field"><label htmlFor="collection-slug">固定網址名稱</label><input id="collection-slug" className="input" name="slug" required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(collection)} defaultValue={collection?.slug} placeholder="lukang-2000" /><p className="muted">小寫英文、數字與連字號。儲存後固定，避免已分享連結失效。</p></div>
          <div className="field"><label htmlFor="collection-status">主題狀態</label><select id="collection-status" className="select" name="status" defaultValue={collection?.status || "draft"}>{Object.entries(collectionStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><p className="muted">只有已發布主題可供客人開啟。</p></div>
          <div className="field full"><label htmlFor="collection-q">物件關鍵字（可留空）</label><input id="collection-q" className="input" name="q" maxLength={200} defaultValue={collection?.q} placeholder="例如：三房、孝親房、中山路" /></div>
          <div className="field"><label htmlFor="collection-city">縣市（可留空）</label><input id="collection-city" className="input" name="city" maxLength={80} defaultValue={collection?.city} placeholder="彰化縣" /></div>
          <div className="field"><label htmlFor="collection-type">物件類型</label><select id="collection-type" className="select" name="property_type" defaultValue={collection?.property_type || ""}><option value="">全部類型</option>{Object.entries(collectionTypes).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}</select></div>
          <div className="field"><label htmlFor="collection-min">最低總價（萬元）</label><input id="collection-min" className="input" type="number" name="price_min" min="0" max="100000000" step="any" defaultValue={collection?.price_min ?? ""} /></div>
          <div className="field"><label htmlFor="collection-max">最高總價（萬元）</label><input id="collection-max" className="input" type="number" name="price_max" min="0" max="100000000" step="any" defaultValue={collection?.price_max ?? ""} /></div>
        </div>
        <fieldset className="collection-districts"><legend>地區複選：包含任一勾選地區，未勾選表示不限地區</legend>{collectionDistricts.map(d => <label key={d}><input type="checkbox" name="district" value={d} defaultChecked={collection?.districts.includes(d)} />{d}</label>)}</fieldset>
        <section className="collection-cover-field" aria-labelledby="collection-cover-title">
          <h2 id="collection-cover-title">專屬分享封面</h2>
          <p className="muted">建議1200×630橫式圖片。JPEG、PNG、WebP，最大5MB；上傳會自動置中裁切。未設定時沿用首頁分享圖。</p>
          <img className="collection-cover-preview" src={image} alt="主題分享封面預覽" width={1200} height={630} />
          <input type="hidden" name="cover_storage_path" value={path} />
          <label>選擇封面<input className="input" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={event => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
          {path ? <button className="button ghost" type="button" disabled={uploading} onClick={() => { invalidate(); setPath(""); setImage(fallbackImage); }}>改用首頁分享圖</button> : null}
        </section>
      </fieldset>
      {error ? <div className="notice" role="alert">{error}</div> : null}
      {message ? <p role="status">{message}</p> : null}
      <div className="actions">
        <button className="button" type="submit" disabled={saving || uploading}>{saving ? "儲存中…" : "儲存主題"}</button>
        <button className="button ghost" type="button" disabled={saving || uploading || previewing} onClick={() => void showPreview()}>{previewing ? "讀取預覽…" : "預覽封面與符合物件"}</button>
        {collection ? <Link className="button ghost" href={`/admin/property-collections/${collection.id}/preview`} target="_blank">開啟已儲存頁面預覽</Link> : null}
      </div>
      {collection?.status === "published" ? <><p className="muted">以下分享使用已儲存的內容；修改後請先儲存。</p><CollectionShare href={propertyCollectionHref(collection.slug)} title={collection.title} origin={origin} /></> : null}
    </form>
    {preview ? <section className="section" aria-label="主題預覽">
      <h2>分享預覽</h2>
      <div className="collection-social-preview card"><img src={image} alt={preview.title} width={1200} height={630} /><div className="card-body"><p className="muted">{new URL(origin).hostname}</p><h3>{preview.title}</h3><p>{preview.description || "阿勇與阿美可以為你詳細介紹。"}</p></div></div>
      <p>{preview.data.length} 件符合條件的在售物件{preview.data.length > 6 ? "，下方先顯示前6件" : ""}。</p>
      <div className="grid">{preview.data.slice(0, 6).map(property => <PropertyCard key={property.id} property={property} />)}</div>
      {!preview.data.length ? <div className="notice">目前沒有符合條件的物件，可以調整地區、類型或預算。</div> : null}
    </section> : null}
  </>;
}
