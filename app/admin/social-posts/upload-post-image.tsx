"use client";
import {useRef,useState} from "react";
import {uploadSocialPostImage} from "./image-actions";

export function UploadPostImage({id}:{id:string}){
 const input=useRef<HTMLInputElement>(null);
 const [files,setFiles]=useState<File[]>([]);
 const [drag,setDrag]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 function addFiles(incoming:FileList|File[]){
   const next=Array.from(incoming).filter(file=>["image/jpeg","image/png","image/webp"].includes(file.type) && file.size<=5*1024*1024);
   setFiles(old=>[...old,...next].slice(0,10));
   if(next.length!==Array.from(incoming).length)setMessage("部分圖片格式不符或超過 5MB，已略過。");
 }
 async function upload(){
   if(!files.length||busy)return;
   setBusy(true);setMessage("");
   let ok=0;let failed=0;let lastError="";
   for(const file of files){
     const data=new FormData();data.set("image",file);
     try{const r=await uploadSocialPostImage(id,data);if(r.ok)ok++;else{failed++;lastError=r.message;}}
     catch{failed++;lastError="上傳失敗，請檢查網路或儲存設定。";}
   }
   setFiles([]);if(input.current)input.current.value="";
   setMessage("成功上傳 "+ok+" 張"+(failed?"，失敗 "+failed+" 張："+lastError:"。請確認縮圖後再發布 Facebook。"));
   setBusy(false);
 }
 return <div style={{display:"grid",gap:10,margin:"12px 0"}}>
   <div role="button" tabIndex={0} onClick={()=>input.current?.click()}
      onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();input.current?.click();}}}
      onDragOver={e=>{e.preventDefault();setDrag(true)}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}}
      style={{border:"2px dashed "+(drag?"#c99b45":"#aaa"),borderRadius:10,padding:22,textAlign:"center",cursor:"pointer",background:drag?"#fff7e8":"transparent"}}>
      <strong>拖拉圖片到這裡，或點擊選擇圖片</strong>
      <p className="muted" style={{margin:"6px 0 0"}}>可多選 JPG、PNG、WebP｜每張最多 5MB｜每篇最多 10 張</p>
   </div>
   <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple
     style={{display:"none"}} onChange={e=>{if(e.target.files)addFiles(e.target.files)}}/>
   {files.length>0?<div style={{display:"grid",gap:6}}>
     <p className="muted">待上傳 {files.length} 張：{files.map(f=>f.name).join("、")}</p>
     <div><button type="button" className="button ghost" disabled={busy} onClick={upload}>{busy?"正在上傳…":"確認上傳圖片"}</button></div>
   </div>:null}
   {message?<p role="status" aria-live="polite" className="notice">{message}</p>:null}
 </div>;
}
