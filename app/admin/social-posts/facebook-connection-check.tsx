"use client";
import { useState } from "react";
import { checkFacebookPageConnection } from "./facebook-connection-actions";

export function FacebookConnectionCheck() {
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<{ok:boolean;message:string;permissions?:string;pageTasks?:string}|null>(null);
  return <section className="card" style={{marginBottom:18}}><div className="card-body">
    <h2>Facebook 粉專連線檢查</h2>
    <p className="muted">唯讀確認 Page Token 身分、粉專基本資料及影片列表是否可讀取；不會發文或刪文，也不會顯示 Token。發布權限仍須於 Meta 管理後台核對。</p>
    <button className="button ghost" type="button" disabled={busy} onClick={async()=>{
      setBusy(true);setResult(null);
      try{setResult(await checkFacebookPageConnection())}
      catch{setResult({ok:false,message:"連線檢查失敗，請確認管理員登入狀態後重試。"})}
      finally{setBusy(false)}
    }}>{busy?"檢查中…":"檢查 Facebook 連線與發布權限"}</button>
    {result ? <div role="status" aria-live="polite" className={result.ok?"success":"notice"} style={{marginTop:10}}>
      <p>{result.message}</p>
      {result.permissions?<p style={{overflowWrap:"anywhere"}}>唯讀 API 檢查：{result.permissions}</p>:null}
      {result.pageTasks?<p style={{overflowWrap:"anywhere"}}>權限確認說明：{result.pageTasks}</p>:null}
    </div>:null}
  </div></section>;
}
