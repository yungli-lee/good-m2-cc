"use client";
import {useState} from "react";
import {publishFacebookVideo} from "./facebook-video-actions";
export function PublishFacebookVideoButton({id,enabled}:{id:string;enabled:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[ok,setOk]=useState(false),[local,setLocal]=useState("");
 async function submit(scheduled:boolean){
   if(busy||!enabled)return;
   let iso:string|undefined;
   if(scheduled){
     const d=new Date(local);
     if(!local||!Number.isFinite(d.getTime())){setMessage("請先選擇有效日期。");return;}
     iso=d.toISOString();
   }
   if(!window.confirm(scheduled?
      "確定將影片預約於 "+new Date(iso!).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})+" 由 Facebook 發布？":
      "確定立即將影片送往「阿勇不動產顧問」粉專？"))return;
   setBusy(true);setMessage("");setOk(false);
   try{const r=await publishFacebookVideo(id,iso);setOk(r.ok);setMessage(r.message);}
   catch(e){setMessage(e instanceof Error?e.message:"影片發布結果待核對，請勿重複發布。");}
   finally{setBusy(false);}
 }
 return <div style={{display:"grid",gap:8,width:"100%"}}>
  <button type="button" className="button" disabled={!enabled||busy} onClick={()=>submit(false)}>
   {busy?"正在處理影片…":enabled?"立即發佈影片到阿勇不動產顧問":"Facebook 發布尚未啟用"}
  </button>
  <label className="field"><span>影片預約時間（瀏覽器當地時間，台灣 UTC+8）</span>
   <input type="datetime-local" className="input" value={local} disabled={busy} onChange={e=>setLocal(e.target.value)}/></label>
  <button type="button" className="button ghost" disabled={!enabled||busy||!local} onClick={()=>submit(true)}>預約 Facebook 影片發文</button>
  {message?<p role="status" aria-live="polite" className={ok?"success":"notice"}>{message}</p>:null}
 </div>;
}
