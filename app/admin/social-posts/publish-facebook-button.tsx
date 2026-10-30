"use client";
import { useState } from "react";
import { publishFacebookPost } from "./facebook-actions";

export function PublishFacebookButton({id, enabled}:{id:string;enabled:boolean}) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [success,setSuccess]=useState(false);
  async function publish() {
    if (busy || !enabled) return;
    if (!window.confirm("確定要將這篇貼文公開發布到「阿勇不動產顧問」Facebook 粉專嗎？")) return;
    setBusy(true);setMessage("");setSuccess(false);
    try {
      await publishFacebookPost(id);
      setSuccess(true);
      setMessage("已成功送出並記錄 Facebook 貼文。請查看下方貼文 ID 與原文連結。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "發布結果無法確認。請先核對 Facebook 粉專，勿重複送出。");
    } finally {
      setBusy(false);
    }
  }
  return <div style={{display:"grid",gap:6}}>
    <button type="button" className="button" onClick={publish} disabled={!enabled || busy} aria-busy={busy}>
      {busy?"正在發布至 Facebook…":enabled?"發布到阿勇不動產顧問":"Facebook 發布尚未啟用"}
    </button>
    {message ? <p role="status" aria-live="polite" className={success?"success":"notice"} style={{margin:0}}>{message}</p> : null}
  </div>;
}
