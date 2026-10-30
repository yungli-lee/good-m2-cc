"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {syncFacebookPostStatus,confirmFacebookPostDeletedManually} from "./sync-facebook-actions";

export function SyncFacebookStatusButton({id,canConfirmDeleted=false}:{id:string;canConfirmDeleted?:boolean}){
 const router=useRouter();
 const [busy,setBusy]=useState(false);
 const [note,setNote]=useState("");
 const [needsReview,setNeedsReview]=useState(false);

 async function handleSync(){
  if(busy)return;
  setBusy(true);setNote("");setNeedsReview(false);
  try{
   const r=await syncFacebookPostStatus(id);
   setNote(r.message);
   setNeedsReview(!r.ok && Boolean(r.needsManualReview));
   if(r.ok)router.refresh();
  }catch{setNote("同步失敗，請確認網路及管理權限。")}
  finally{setBusy(false)}
 }

 async function handleManualConfirmation(){
  if(busy)return;
  const phrase=window.prompt("請先在 Facebook／Meta Business Suite 確認這篇原文已刪除。\n此操作只會將後台紀錄封存並隱藏，不會向 Facebook 刪文。\n\n若已確認，請輸入：確認已刪除");
  if(phrase!=="確認已刪除")return;
  if(!window.confirm("再次確認：Facebook 原文已由你手動刪除？\n後台將隱藏這篇貼文，保留原貼文 ID 及歷史紀錄。"))return;
  setBusy(true);setNote("");
  try{
   const r=await confirmFacebookPostDeletedManually(id,phrase);
   setNote(r.message);
   if(r.ok){setNeedsReview(false);router.refresh();}
  }catch{setNote("人工確認更新失敗，請重新整理後核對貼文狀態。")}
  finally{setBusy(false)}
 }

 return <div style={{display:"grid",gap:6}}>
  <button type="button" className="button ghost" disabled={busy} onClick={handleSync}>{busy?"核對中…":"同步 Facebook 狀態"}</button>
  {note?<p role="status" aria-live="polite" className="muted" style={{margin:0}}>{note}</p>:null}
  {needsReview?<p className="muted" style={{margin:0}}>待人工確認：Meta 無法可靠判斷原文是否已刪除，後台紀錄暫不變更。</p>:null}
  {needsReview&&canConfirmDeleted?<button type="button" className="button ghost" disabled={busy} onClick={handleManualConfirmation}>我已在 Facebook 確認原文刪除（封存後台紀錄）</button>:null}
 </div>;
}
