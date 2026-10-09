"use client";
import { useState } from "react";
type Role = "ayong" | "amei" | "duo";
export function AssistantImageManager({ initial, initialDuoVideo }: { initial: Partial<Record<Role,string>>; initialDuoVideo?: string | null }) {
  const [images, setImages] = useState(initial);
  const [duoVideo, setDuoVideo] = useState(initialDuoVideo || "");
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoMessage, setVideoMessage] = useState("");
  const [busy, setBusy] = useState<Role | null>(null);
  const [messages, setMessages] = useState<Partial<Record<Role,string>>>({});
  async function upload(role: Role, file?: File) {
    if (!file) return;
    if (!["image/png", "image/webp"].includes(file.type) || file.size > 5*1024*1024) { setMessages(v=>({...v,[role]:"請使用 5MB 以下 PNG／WebP"})); return; }
    setBusy(role); setMessages(v=>({...v,[role]:"正在上傳…"}));
    try {
      const form = new FormData(); form.set("role",role); form.set("file",file);
      const response = await fetch("/api/admin/assistant-images", { method: "POST", body: form });
      const data = await response.json() as { data?: { url: string }; error?: string };
      if (!response.ok || !data.data) throw new Error(data.error || "上傳失敗");
      setImages(v=>({...v,[role]:data.data!.url}));
      setMessages(v=>({...v,[role]:"已儲存。請重新開啟前台檢查顯示。"}));
    } catch (error) { setMessages(v=>({...v,[role]:error instanceof Error ? error.message : "上傳失敗"})); }
    finally { setBusy(null); }
  }
  async function uploadDuoVideo(file?: File) {
    if (!file) return;
    if (!["video/mp4", "video/webm"].includes(file.type) || file.size > 12 * 1024 * 1024) {
      setVideoMessage("請選擇 12MB 以下 MP4／WebM 影片"); return;
    }
    setVideoBusy(true); setVideoMessage("影片正在上傳…");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/admin/assistant-duo-video", { method: "POST", body: form });
      const payload = await response.json() as { data?: {url:string}; error?: string };
      if (!response.ok || !payload.data?.url) throw new Error(payload.error || "影片上傳失敗");
      setDuoVideo(payload.data.url);
      setVideoMessage("動畫已儲存，請在 Preview 前台檢查播放效果。");
    } catch (error) { setVideoMessage(error instanceof Error ? error.message : "影片上傳失敗"); }
    finally { setVideoBusy(false); }
  }
  return <div className="grid">{(["amei","ayong","duo"] as const).map(role=><section className="card" key={role}><div className="card-body">
    <h2>{role==="amei"?"AI 阿美":role==="ayong"?"AI 阿勇":"AI 雙人浮動入口"}</h2>
    <p className="muted">上傳後立即更新這個圖片欄位，不影響其他圖片。建議透明背景 PNG／WebP、正方形、5MB 以下。</p>
    <img src={images[role] || "/images/guides/ayong-amei.webp"} alt={role==="amei"?"阿美形象預覽":role==="ayong"?"阿勇形象預覽":"雙人聊天入口預覽"} style={{ display:"block",width:180,height:180,objectFit:"contain",background:"#f3f4f6",borderRadius:12 }} />
    <input aria-label={role==="amei"?"更換阿美圖片":role==="ayong"?"更換阿勇圖片":"更換雙人版圖片"} type="file" accept="image/png,image/webp" disabled={busy!==null} onChange={e=>{void upload(role,e.target.files?.[0]);e.target.value="";}} />
    <p role="status">{messages[role] || ""}</p>
  </div></section>)}<section className="card"><div className="card-body">
    <h2>AI 雙人入口動畫（選用）</h2>
    <p className="muted">僅影響物件頁右下角雙人浮動入口；不影響 Facebook 分享圖、單人角色或對話功能。支援 MP4／WebM、12MB 以下，靜音循環播放；失敗時顯示原本雙人圖片。</p>
    {duoVideo ? <video key={duoVideo} controls muted playsInline loop preload="metadata" src={duoVideo} poster={images.duo} style={{display:"block",width:180,height:180,objectFit:"contain",background:"#f3f4f6",borderRadius:12}} /> : <p>尚未設定動畫，前台維持靜態雙人圖。</p>}
    <input type="file" aria-label="上傳雙人入口動畫" accept="video/mp4,video/webm" disabled={videoBusy || busy!==null} onChange={e=>{void uploadDuoVideo(e.target.files?.[0]);e.target.value="";}} />
    <p role="status">{videoMessage}</p>
  </div></section></div>;
}
