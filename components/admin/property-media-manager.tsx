"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import type { PropertyMedia } from "@/lib/properties/types";

export function PropertyMediaManager({
  media,
  uploadAction,
  setCoverAction,
  deleteActionBase
}: {
  media: PropertyMedia[];
  uploadAction: string;
  setCoverAction: string;
  deleteActionBase?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  function handleFileDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (!file || !fileInputRef.current) return;
    fileInputRef.current.files = event.dataTransfer.files;
    setSelectedFileName(file.name);
  }

  return (
    <section className="section" style={{ paddingBottom: 0 }}>
      <h2>物件照片</h2>
      <form action={uploadAction} method="post" encType="multipart/form-data" className="form-grid" style={{ marginBottom: 18 }}>
        <div
          className={`field media-dropzone${isDraggingFile ? " is-dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={handleFileDrop}
        >
          <label htmlFor="file">上傳照片</label>
          <input
            ref={fileInputRef}
            className="input"
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(event) => setSelectedFileName(event.currentTarget.files?.[0]?.name || "")}
          />
          <span className="muted">{selectedFileName ? `已選擇：${selectedFileName}` : "可點選選擇檔案，或將照片拖曳到此欄位。"}</span>
        </div>
        <div className="field">
          <label htmlFor="alt_text">照片說明</label>
          <input className="input" id="alt_text" name="alt_text" />
        </div>
        <div className="field full">
          <button className="button" type="submit" formAction={uploadAction} formMethod="post">上傳照片</button>
        </div>
      </form>
      {media.length === 0 ? <div className="notice">尚未上傳照片。</div> : null}
      <div className="grid">
        {media.map((item) => {
          return (
            <article className="card" key={item.id}>
              <img className="property-image" src={item.url} alt={item.alt_text || "物件照片"} loading="lazy" />
              <div className="card-body">
                <p>{item.alt_text || "未填寫照片說明"}</p>
                <p className="muted">{item.is_cover ? "目前封面照片" : "一般照片"}</p>
                {!item.is_cover ? (
                  <form action={setCoverAction} method="post">
                    <input type="hidden" name="media_id" value={item.id} />
                    <button className="button secondary" type="submit" formAction={setCoverAction} formMethod="post">設為封面</button>
                  </form>
                ) : null}
                {deleteActionBase ? (
                  <form action={`${deleteActionBase}/${item.id}/delete`} method="post" style={{ marginTop: 8 }}>
                    <button className="button danger" type="submit">刪除照片</button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
