"use client";
import { useState } from "react";
import { deleteFacebookPost } from "./facebook-actions";
export function DeleteFacebookButton({id}:{id:string}) {
 const [busy,setBusy]=useState(false);
 return <form action={async()=>{if(!window.confirm("確定要從 Facebook 永久刪除這篇貼文嗎？此操作無法復原，後台紀錄會保留。")) return;
 setBusy(true);try{await deleteFacebookPost(id)}catch(e){window.alert(e instanceof Error?e.message:"刪除失敗")}finally{setBusy(false)}}}>
 <button type="submit" className="button danger" disabled={busy}>{busy?"處理中…":"刪除 Facebook 原文"}</button></form>;
}
