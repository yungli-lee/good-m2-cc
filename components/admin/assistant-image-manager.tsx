"use client";
import { useState } from "react";
type Role = "ayong" | "amei";
export function AssistantImageManager({ initial }: { initial: Partial<Record<Role,string>> }) {
  const [images, setImages] = useState(initial);
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
  return <div className="grid">{(["amei","ayong"] as const).map(role=><section className="card" key={role}><div className="card-body">
    <h2>{role==="amei"?"AI 阿美":"AI 阿勇"}</h2>
    <p className="muted">上傳後立即更新本角色，不影響另一位。建議透明背景 PNG／WebP、正方形、5MB 以下。</p>
    <img src={images[role] || "/images/guides/ayong-amei.webp"} alt={role==="amei"?"阿美形象預覽":"阿勇形象預覽"} style={{ display:"block",width:180,height:180,objectFit:"contain",background:"#f3f4f6",borderRadius:12 }} />
    <input aria-label={role==="amei"?"更換阿美圖片":"更換阿勇圖片"} type="file" accept="image/png,image/webp" disabled={busy!==null} onChange={e=>{void upload(role,e.target.files?.[0]);e.target.value="";}} />
    <p role="status">{messages[role] || ""}</p>
  </div></section>)}</div>;
}
