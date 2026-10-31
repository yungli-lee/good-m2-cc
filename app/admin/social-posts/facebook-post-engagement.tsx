"use client";
import {useState} from "react";
import {getFacebookPostEngagement,type FacebookEngagement} from "./facebook-bulk-and-insights-actions";
export function FacebookPostEngagement({id}:{id:string}){
 const[busy,setBusy]=useState(false),[data,setData]=useState<FacebookEngagement|null>(null),[error,setError]=useState("");
 async function load(){
  setBusy(true);setError("");
  try{setData(await getFacebookPostEngagement(id));}
  catch(e){setError(e instanceof Error?e.message:"無法取得 Meta 成效資料");}
  finally{setBusy(false);}
 }
 const fmt=(v:number|null)=>v===null?"無法取得":v.toLocaleString("zh-TW");
 return <details style={{margin:"12px 0"}}><summary style={{cursor:"pointer",fontWeight:600}}>Facebook 貼文成效分析</summary>
  <div style={{display:"grid",gap:10,marginTop:10}}>
   <button className="button ghost" type="button" disabled={busy} onClick={load}>{busy?"正在向 Meta 取得數據…":data?"重新整理成效":"查詢這篇貼文的成效"}</button>
   {error?<p role="status" className="notice">{error}</p>:null}
   {data?<><div style={{display:"flex",gap:18,flexWrap:"wrap"}}>
    <span>心情反應：<strong>{fmt(data.reactions)}</strong></span>
    <span>留言：<strong>{fmt(data.comments)}</strong></span>
    <span>分享：<strong>{fmt(data.shares)}</strong></span>
    <span>貼文曝光：<strong>{fmt(data.impressions)}</strong></span>
    <span>影片觀看：<strong>{fmt(data.videoViews)}</strong></span>
   </div><p className="muted">{data.note}</p><details><summary style={{cursor:"pointer",fontSize:13}}>Meta API 指標診斷</summary><div style={{display:"grid",gap:4,marginTop:8}}>{Object.entries(data.diagnostics||{}).map(([name,message])=><div key={name} className="muted" style={{fontSize:13}}>{name}：{message}</div>)}</div></details></>:null}
  </div>
 </details>;
}
