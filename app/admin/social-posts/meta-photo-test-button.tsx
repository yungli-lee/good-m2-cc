"use client";
import {useState} from "react";
import {testMetaPhoto} from "./meta-photo-test-actions";
export function MetaPhotoTestButton({id}:{id:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 return <div style={{display:"grid",gap:6}}>
  <button type="button" className="button ghost" disabled={busy} onClick={async()=>{
   if(!window.confirm("此操作會將一張圖片傳送至 Meta 並建立未公開 Photo ID，不會建立公開粉專貼文。要繼續嗎？"))return;
   setBusy(true);setMessage("");
   try{const result=await testMetaPhoto(id);setMessage(result.message)}
   catch{setMessage("測試未完成，請查看 Preview Logs。")}
   finally{setBusy(false)}
  }}>{busy?"測試 Meta 圖片 API 中…":"測試 Meta 單張圖片（不公開）"}</button>
  {message?<p role="status" aria-live="polite" className="notice" style={{margin:0}}>{message}</p>:null}
 </div>;
}
