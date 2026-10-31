"use client";
import {useState} from "react";
import {syncFacebookPostStatus} from "./sync-facebook-actions";
export function SyncFacebookStatusButton({id}:{id:string}){
 const[busy,setBusy]=useState(false),[note,setNote]=useState("");
 return <div style={{display:"grid",gap:6}}>
  <button type="button" className="button ghost" disabled={busy} onClick={async()=>{
   setBusy(true);setNote("");
   try{const r=await syncFacebookPostStatus(id);setNote(r.message)}
   catch{setNote("同步失敗，請確認網路及管理權限。")}
   finally{setBusy(false)}
  }} title="同步 Facebook 狀態" aria-label="同步 Facebook 狀態" style={{width:38,height:36,padding:0}}>{busy?"…":"↻"}</button>
  {note?<p role="status" aria-live="polite" className="muted" style={{margin:0}}>{note}</p>:null}
 </div>;
}
