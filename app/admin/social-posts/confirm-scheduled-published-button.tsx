"use client";
import {useState} from "react";
import {confirmFacebookScheduledPublished} from "./sync-facebook-actions";
export function ConfirmScheduledPublishedButton({id}:{id:string}){
 const [busy,setBusy]=useState(false),[note,setNote]=useState("");
 async function confirm(){
  if(busy||!window.confirm("請先親自確認 Facebook 粉專原文已公開發布。\n\n確定要將這篇預約貼文的後台狀態人工更新為「已發布」嗎？\n此操作不會重新發文。"))return;
  setBusy(true);setNote("");
  try{const r=await confirmFacebookScheduledPublished(id);setNote(r.message);}
  catch{setNote("人工確認失敗，原有狀態不變。");}
  finally{setBusy(false);}
 }
 return <div style={{display:"grid",gap:6}}>
  <button type="button" className="button ghost" disabled={busy} onClick={confirm}>{busy?"更新中…":"我已在 Facebook 確認公開發布"}</button>
  {note?<p role="status" className="muted">{note}</p>:null}
 </div>;
}
