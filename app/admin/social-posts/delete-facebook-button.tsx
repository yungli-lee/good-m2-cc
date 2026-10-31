"use client";
import { useState } from "react";
import { deleteFacebookPost } from "./facebook-actions";
export function DeleteFacebookButton({id}:{id:string}) {
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [success,setSuccess]=useState(false);
 async function handleDelete(){
   if(busy || !window.confirm("確定要從 Facebook 永久刪除這篇貼文嗎？此操作無法復原，後台紀錄會保留。"))return;
   setBusy(true);setNotice("");setSuccess(false);
   try {
     const result=await deleteFacebookPost(id);
     setSuccess(result.ok);setNotice(result.message);
   } catch {
     setNotice("刪文發生錯誤，請勿重複操作。先確認 Facebook 原文是否仍存在，再檢查後台記錄。");
   } finally {setBusy(false)}
 }
 return <div style={{display:"grid",gap:6}}>
   <button type="button" className="button ghost" style={{width:38,height:36,padding:0,color:"#b42318",border:"1px solid #e8b4b0"}} title="刪除 Facebook 原文" aria-label="刪除 Facebook 原文" onClick={handleDelete} disabled={busy}>{busy?"…":"✕"}</button>
   {notice?<p role="status" aria-live="polite" className={success?"success":"notice"} style={{margin:0}}>{notice}</p>:null}
 </div>;
}
