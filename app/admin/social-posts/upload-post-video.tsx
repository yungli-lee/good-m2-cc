"use client";
import {useRef,useState} from "react";
import {prepareSocialVideoUpload,confirmSocialVideoUpload,removeSocialVideoDraft} from "./video-actions";

export function UploadPostVideo({id,existingUrl}:{id:string;existingUrl?:string}){
 const input=useRef<HTMLInputElement>(null);
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const [message,setMessage]=useState("");
 const [saved,setSaved]=useState(Boolean(existingUrl));
 async function upload(){
  if(!file||busy||saved)return;
  setBusy(true);setMessage("");
  try{
   const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
   if(header.length<12||String.fromCharCode(...header.slice(4,8))!=="ftyp"){
    setMessage("檔案不是可辨識的 MP4 容器");return;
   }
   setProgress("建立安全上傳連結…");
   const ticket=await prepareSocialVideoUpload(id,file.name,file.size,file.type);
   if(!ticket.ok||!ticket.url||!ticket.path){setMessage(ticket.message);return;}
   setProgress("影片正在傳送至素材庫，請勿關閉頁面…");
   const response=await fetch(ticket.url,{method:"PUT",headers:{"Content-Type":"video/mp4","x-upsert":"false"},body:file});
   if(!response.ok){setMessage("上傳未完成（HTTP "+response.status+"），請勿直接發文");return;}
   setProgress("驗證已上傳影片…");
   const result=await confirmSocialVideoUpload(id,ticket.path);
   setMessage(result.message);
   if(result.ok){setSaved(true);setFile(null);}
  }catch(e){setMessage("影片上傳中斷，請先確認素材庫，避免重複上傳。"+(e instanceof Error?" ("+e.name+")":""));}
  finally{setBusy(false);setProgress("");}
 }
 async function remove(){
  if(busy||!saved||!window.confirm("確定移除這篇草稿的影片嗎？"))return;
  setBusy(true);setMessage("");
  try{const r=await removeSocialVideoDraft(id);setMessage(r.message);if(r.ok)setSaved(false);}
  catch{setMessage("移除失敗，請稍後再試");}
  finally{setBusy(false);}
 }
 return <div style={{display:"grid",gap:8,margin:"12px 0"}}>
  <strong>影片素材（Preview 測試）</strong>
  {saved?<><p className="muted">已上傳 1 段影片，尚未開放影片發布。</p>
    {existingUrl?<video controls preload="metadata" src={existingUrl} style={{width:"100%",maxWidth:480,borderRadius:8}}/>:null}
    <div><button type="button" className="button ghost" disabled={busy} onClick={remove}>移除影片</button></div></>:
    <><label className="field"><span>選擇 MP4（20MB 以下，每篇一段；不可與圖片並存）</span>
      <input ref={input} className="input" type="file" accept="video/mp4,.mp4" disabled={busy} onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
      {file?<p className="muted">{file.name} · {(file.size/1024/1024).toFixed(1)} MB</p>:null}
      <div><button type="button" className="button ghost" disabled={busy||!file} onClick={upload}>{busy?"上傳中…":"確認上傳影片"}</button></div></>}
  {progress?<p role="status" className="muted">{progress}</p>:null}
  {message?<p role="status" aria-live="polite" className="notice">{message}</p>:null}
 </div>;
}
