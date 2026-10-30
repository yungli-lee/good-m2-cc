"use client";
import { useState } from "react";
import { scheduleFacebookPost } from "./facebook-actions";

export function ScheduleFacebookButton({id,enabled}:{id:string;enabled:boolean}) {
 const [local,setLocal]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 async function run(){
   if(!local || busy || !enabled)return;
   const timestamp=new Date(local);
   if(!Number.isFinite(timestamp.getTime())){setMessage("日期格式無效");return}
   if(!window.confirm("確定要由 Facebook 在 "+timestamp.toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})+" 發布這篇貼文嗎？"))return;
   setBusy(true);setMessage("");
   try{
     const r=await scheduleFacebookPost(id,timestamp.toISOString());
     setMessage(r.message);
   }catch{setMessage("預約未確認。請先檢查 Facebook 排程，避免重複發文。")}
   finally{setBusy(false)}
 }
 return <div style={{display:"grid",gap:6}}>
   <label className="field"><span>預約發布時間（瀏覽器當地時間，台灣請使用 UTC+8）</span>
     <input className="input" type="datetime-local" value={local} onChange={e=>setLocal(e.target.value)}/></label>
   <button type="button" className="button ghost" onClick={run} disabled={!enabled||busy||!local}>{busy?"預約中…":"預約 Facebook 發文"}</button>
   {message?<p role="status" aria-live="polite" className="notice">{message}</p>:null}
 </div>
}
