"use client";
import {Children,useMemo,useState,type ReactNode} from "react";

type IndexRow={id:string;title:string;body:string;category:string;status:string;facebookPostId:string|null;deleted:boolean;searchText:string};
export function SocialPostIndex({items,children}:{items:IndexRow[];children:ReactNode}){
 const [query,setQuery]=useState("");
 const [view,setView]=useState<"active"|"deleted"|"all">("active");
 const cards=Children.toArray(children);
 const visible=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase();
  return items.map((p,i)=>({p,i})).filter(({p})=>{
   if(view==="active"&&p.deleted)return false;
   if(view==="deleted"&&!p.deleted)return false;
   return !q||p.searchText.toLocaleLowerCase().includes(q);
  });
 },[items,query,view]);
 const deletedCount=items.filter(p=>p.deleted).length;
 const activeCount=items.length-deletedCount;
 return <section aria-label="貼文索引查詢">
  <h2>我的貼文索引（最近 {items.length} 筆）</h2>
  <div className="card" style={{marginBottom:16}}><div className="card-body" style={{display:"grid",gap:12}}>
   <label className="field"><span>搜尋貼文（標題、文案、Hashtag、網址、Facebook ID）</span>
    <input className="input" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="輸入關鍵字查詢最近 100 筆紀錄" aria-label="搜尋貼文"/></label>
   <div className="admin-actions" style={{flexWrap:"wrap",gap:8}}>
    {([["active","目前貼文",activeCount],["deleted","已下架／已刪除",deletedCount],["all","全部紀錄",items.length]] as const).map(([key,label,count])=>
     <button key={key} type="button" className={view===key?"button":"button ghost"} onClick={()=>setView(key)} aria-pressed={view===key}>{label}（{count}）</button>)}
   </div>
   <p className="muted" role="status" style={{margin:0}}>符合 {visible.length} 筆。預設不顯示已封存或 Facebook 已刪除的貼文；查詢範圍為後台最近 100 筆紀錄。</p>
  </div></div>
  <div style={{display:"grid",gap:14}}>
   {visible.map(({p,i})=><div key={p.id}>{cards[i]}</div>)}
   {!visible.length?<p className="muted">沒有符合條件的貼文。可以切換「已下架／已刪除」或「全部紀錄」查詢。</p>:null}
  </div>
 </section>;
}
