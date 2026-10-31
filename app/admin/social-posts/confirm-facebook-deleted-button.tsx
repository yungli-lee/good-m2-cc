"use client";
import {useState} from "react";
import {confirmFacebookDeletedExternally} from "./sync-facebook-actions";
export function ConfirmFacebookDeletedButton({id}:{id:string}){
 const[busy,setBusy]=useState(false),[note,setNote]=useState(""),[ok,setOk]=useState(false);
 async function confirm(){
  if(busy||!window.confirm(
   "請先到 Facebook 粉專或 Meta Business Suite 親自確認：原始貼文確實已被刪除，而不是隱藏、尚未公開或暫時無權查看。\n\n確定將這筆後台紀錄標記為「Facebook 端已刪除」嗎？\n\n文案、原貼文 ID 及歷史紀錄都會保留；不會再向 Facebook 發送刪文要求。"
  ))return;
  setBusy(true);setNote("");setOk(false);
  try{const r=await confirmFacebookDeletedExternally(id);setOk(r.ok);setNote(r.message);}
  catch{setNote("核對紀錄失敗，後台狀態未確認變更。");}
  finally{setBusy(false);}
 }
 return <div style={{display:"grid",gap:6}}>
  <button type="button" className="button ghost" style={{width:38,height:36,padding:0}} title="人工確認 Facebook 原文已在站外刪除" aria-label="人工確認 Facebook 原文已在站外刪除" disabled={busy} onClick={confirm}>
   {busy?"…":"✓"}
  </button>
  {note?<p role="status" aria-live="polite" className={ok?"success":"notice"}>{note}</p>:null}
 </div>;
}
