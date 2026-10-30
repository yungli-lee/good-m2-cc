"use client";
import {useState} from "react";
import {uploadSocialPostImage} from "./image-actions";
export function UploadPostImage({id}:{id:string}){
 const[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 return <form action={async(formData)=>{setBusy(true);setMessage("");try{const r=await uploadSocialPostImage(id,formData);setMessage(r.message)}catch{setMessage("圖片上傳失敗，請檢查 Preview 儲存設定。")}finally{setBusy(false)}}} style={{display:"grid",gap:8}}>
 <label className="field"><span>新增圖片（JPG／PNG／WebP，單張 5MB 以下，最多 10 張）</span>
 <input className="input" type="file" name="image" accept="image/jpeg,image/png,image/webp" required disabled={busy}/></label>
 <div><button type="submit" className="button ghost" disabled={busy}>{busy?"上傳中…":"上傳圖片"}</button></div>
 {message?<p role="status" aria-live="polite" className="notice">{message}</p>:null}
 </form>
}
