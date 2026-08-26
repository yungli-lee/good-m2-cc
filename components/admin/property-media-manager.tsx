"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { buildFileSelection } from "@/lib/media/file-selection";
import type { FileSelectionSource } from "@/lib/media/file-selection";
import { placeMediaId, moveMediaId } from "@/lib/properties/media-order";
import type { PropertyMedia } from "@/lib/properties/types";
import { PropertyCoverImage } from "@/components/media/property-cover-image";

export function PropertyMediaManager({
  media,
  uploadAction,
  setCoverAction,
  reorderAction,
  deleteActionBase
}: {
  media: PropertyMedia[];
  uploadAction: string;
  setCoverAction: string;
  reorderAction: string;
  deleteActionBase?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFilesRef = useRef<File[]>([]);
  const draggedMediaIdRef = useRef<string | null>(null);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [hasLargeVideo, setHasLargeVideo] = useState(false);
  const [orderedMedia, setOrderedMedia] = useState(media);
  const [orderStatus, setOrderStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  useEffect(() => setOrderedMedia(media), [media]);

  function appendFiles(files: FileList | null, source: FileSelectionSource) {
    if (!files?.length || !fileInputRef.current) return;
    const selection = buildFileSelection(selectedFilesRef.current, files, source);
    if (selection.shouldReplaceInputFiles) fileInputRef.current.files = selection.fileList;
    selectedFilesRef.current = selection.files;
    setSelectedFileNames(selection.fileNames);
    setHasLargeVideo(selection.hasLargeVideo);
  }

  function handleFileDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
    appendFiles(event.dataTransfer.files, "drop");
  }

  async function saveOrder(next: PropertyMedia[], previous: PropertyMedia[]) {
    setOrderedMedia(next);
    setOrderStatus("saving");
    try {
      const response = await fetch(reorderAction, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ordered_ids: next.map((item) => item.id) })
      });
      if (!response.ok) throw new Error("reorder_failed");
      setOrderStatus("saved");
    } catch {
      setOrderedMedia(previous);
      setOrderStatus("error");
    }
  }

  function moveMedia(mediaId: string, direction: -1 | 1) {
    if (orderStatus === "saving") return;
    const ids = moveMediaId(orderedMedia.map((item) => item.id), mediaId, direction);
    if (ids.every((id, index) => id === orderedMedia[index]?.id)) return;
    const byId = new Map(orderedMedia.map((item) => [item.id, item]));
    void saveOrder(ids.map((id) => byId.get(id)!), orderedMedia);
  }

  function dropMedia(targetId: string) {
    const draggedId = draggedMediaIdRef.current;
    if (!draggedId || orderStatus === "saving") return;
    const ids = placeMediaId(orderedMedia.map((item) => item.id), draggedId, targetId);
    const previous = orderedMedia;
    setDraggedMediaId(null);
    draggedMediaIdRef.current = null;
    setDropTargetId(null);
    if (ids.every((id, index) => id === previous[index]?.id)) return;
    const byId = new Map(previous.map((item) => [item.id, item]));
    void saveOrder(ids.map((id) => byId.get(id)!), previous);
  }

  return (
    <section className="section" style={{ paddingBottom: 0 }}>
      <h2>物件媒體</h2>
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
          <label htmlFor="file">上傳圖片或影片</label>
          <input
            ref={fileInputRef}
            className="input"
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            multiple
            required
            onChange={(event) => appendFiles(event.currentTarget.files, "input")}
          />
          <span className="muted">
            {selectedFileNames.length ? `已選擇 ${selectedFileNames.length} 個檔案：${selectedFileNames.join("、")}` : "圖片上限 5MB；影片僅支援 MP4、WebM，上限 100MB。"}
          </span>
          {hasLargeVideo ? <span className="notice">影片超過 20MB，可能增加行動網路載入時間。</span> : null}
        </div>
        <div className="field">
          <label htmlFor="poster">影片 Poster（影片必填）</label>
          <input className="input" id="poster" name="poster" type="file" accept="image/jpeg,image/png,image/webp" />
          <span className="muted">每次最多上傳一支影片；poster 圖片上限 5MB。</span>
        </div>
        <div className="field">
          <label htmlFor="alt_text">照片說明</label>
          <input className="input" id="alt_text" name="alt_text" />
        </div>
        <div className="field full">
          <button className="button" type="submit" formAction={uploadAction} formMethod="post">上傳媒體</button>
        </div>
      </form>
      {media.length === 0 ? <div className="notice">尚未上傳媒體。</div> : null}
      {orderStatus === "saving" ? <div className="notice" role="status">正在儲存排序…</div> : null}
      {orderStatus === "saved" ? <div className="notice" role="status">排序已儲存</div> : null}
      {orderStatus === "error" ? <div className="notice" role="alert">排序儲存失敗，已恢復原順序</div> : null}
      <p className="muted">拖曳調整順序，或使用上移、下移按鈕。</p>
      <div className="grid property-media-admin-grid">
        {orderedMedia.map((item, index) => {
          const canSetCover = !item.is_cover && (item.media_type === "image" || Boolean(item.thumbnail_url));
          return (
            <article
              className={`card property-media-admin-card${draggedMediaId === item.id ? " is-dragging" : ""}${dropTargetId === item.id ? " is-drop-target" : ""}`}
              key={item.id}
              onDragOver={(event) => {
                if (!draggedMediaIdRef.current || draggedMediaIdRef.current === item.id) return;
                event.preventDefault();
                setDropTargetId(item.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                dropMedia(item.id);
              }}
            >
              <div
                className="media-drag-handle"
                role="button"
                tabIndex={0}
                draggable={orderStatus !== "saving"}
                aria-disabled={orderStatus === "saving"}
                aria-label={`拖曳調整順序：${item.alt_text || (item.media_type === "video" ? "物件影片" : "物件照片")}`}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp") moveMedia(item.id, -1);
                  if (event.key === "ArrowDown") moveMedia(item.id, 1);
                }}
                onDragStart={(event) => {
                  draggedMediaIdRef.current = item.id;
                  setDraggedMediaId(item.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                }}
                onDragEnd={() => {
                  draggedMediaIdRef.current = null;
                  setDraggedMediaId(null);
                  setDropTargetId(null);
                }}
              >☰ 拖曳調整順序</div>
              <PropertyCoverImage
                className="property-image"
                src={item.media_type === "video" ? item.thumbnail_url || "" : item.url}
                alt={item.alt_text || (item.media_type === "video" ? "物件影片 Poster" : "物件照片")}
              />
              <div className="card-body">
                <p>{item.alt_text || "未填寫照片說明"}</p>
                <p className="muted">{item.is_cover ? (item.media_type === "video" ? "目前封面影片" : "目前封面照片") : (item.media_type === "video" ? "一般影片" : "一般照片")}</p>
                <div className="media-order-actions" aria-label="媒體排序控制">
                  <button className="button ghost media-order-button" type="button" disabled={index === 0 || orderStatus === "saving"} onClick={() => moveMedia(item.id, -1)}>上移</button>
                  <button className="button ghost media-order-button" type="button" disabled={index === orderedMedia.length - 1 || orderStatus === "saving"} onClick={() => moveMedia(item.id, 1)}>下移</button>
                </div>
                {canSetCover ? (
                  <form action={setCoverAction} method="post">
                    <input type="hidden" name="media_id" value={item.id} />
                    <button className="button secondary" type="submit" formAction={setCoverAction} formMethod="post" disabled={orderStatus === "saving"}>設為封面</button>
                  </form>
                ) : null}
                {item.media_type === "video" && !item.thumbnail_url ? <p className="muted">缺少 Poster，無法設為封面。</p> : null}
                {deleteActionBase ? (
                  <form action={`${deleteActionBase}/${item.id}/delete`} method="post" style={{ marginTop: 8 }}>
                    <button className="button danger" type="submit" disabled={orderStatus === "saving"}>刪除媒體</button>
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
