"use client";
import { useState } from "react";
import { checkFacebookPageConnection } from "./facebook-connection-actions";

export function FacebookConnectionCheck() {
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<{ok:boolean;message:string}|null>(null);
  return <section className="card" style={{marginBottom:18}}><div className="card-body">
    <h2>Facebook 粉專連線檢查</h2>
    <p className="muted">僅檢查 Preview 伺服器持有的權杖是否可讀取指定粉專；不會發文或刪文，也不會顯示 Token。</p>
    <button className="button ghost" type="button" disabled={busy} onClick={async()=>{
      setBusy(true);setResult(null);
      try{setResult(await checkFacebookPageConnection())}
      catch{setResult({ok:false,message:"連線檢查失敗，請確認管理員登入狀態後重試。"})}
      finally{setBusy(false)}
    }}>{busy?"檢查中…":"檢查 Facebook 連線"}</button>
    {result ? <p role="status" aria-live="polite" className={result.ok?"success":"notice"} style={{marginTop:10}}>{result.message}</p>:null}
  </div></section>;
}
