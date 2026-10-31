"use client";
import {useState} from "react";
import {syncAllFacebookPosts} from "./facebook-bulk-and-insights-actions";
type Row={id:string;title:string;facebookId:string;state:"exists"|"published"|"scheduled"|"suspected"|"unverified";message:string};
export function BulkFacebookSync(){
 const[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[rows,setRows]=useState<Row[]>([]);
 async function run(){
  if(busy)return;setBusy(true);setMessage("");setRows([]);
  try{const r=await syncAllFacebookPosts();setMessage(r.message);setRows(r.results);}
  catch{setMessage("全部同步未完成，原有紀錄不變。");}
  finally{setBusy(false);}
 }
 const labels={exists:"確認存在",published:"已公開",scheduled:"已排程／待確認",suspected:"疑似站外刪除",unverified:"無法確認"};
 return <section className="card" style={{marginBottom:22}}><div className="card-body">
  <h2>Facebook 全部同步與異常核對</h2>
  <p className="muted">一次檢查最近最多 100 筆未封存的 Facebook 已發布／預約紀錄。Meta 權限錯誤不代表已刪文；此功能不會自動封存或重新發文。</p>
  <button className="button" type="button" disabled={busy} onClick={run}>{busy?"正在逐筆核對…":"全部同步 Facebook 狀態"}</button>
  {message?<p role="status" aria-live="polite">{message}</p>:null}
  {rows.length?<details open><summary>同步明細（{rows.length} 筆）</summary>
   <div style={{display:"grid",gap:8,marginTop:10}}>
    {rows.filter(r=>r.state==="suspected"||r.state==="unverified").map(r=>
     <div key={r.id} className="notice"><strong>{r.title}</strong> · {labels[r.state]}
      <p style={{margin:"4px 0"}}>{r.message}</p>
      <small>Facebook ID：{r.facebookId}</small>
      <p style={{margin:"4px 0"}}>請先至粉專核對，再使用該筆紀錄的「Facebook 原文已在站外刪除」。</p>
     </div>)}
    {rows.every(r=>r.state!=="suspected"&&r.state!=="unverified")?<p className="muted">本次沒有需要人工核對的紀錄。</p>:null}
    <details><summary>查看其餘已核對紀錄</summary>
     {rows.filter(r=>r.state!=="suspected"&&r.state!=="unverified").map(r=>
      <p key={r.id}>{r.title} · {labels[r.state]} · {r.message}</p>)}
    </details>
   </div></details>:null}
 </div></section>;
}
