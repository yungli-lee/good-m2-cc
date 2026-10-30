"use client";
import {useState} from "react";
import {diagnoseSocialImages} from "./diagnose-images-actions";
export function DiagnoseImagesButton({id}:{id:string}){
 const[busy,setBusy]=useState(false),[result,setResult]=useState("");
 return <div style={{display:"grid",gap:5}}><button className="button ghost" type="button" disabled={busy} onClick={async()=>{
  setBusy(true);setResult("");
  try{setResult((await diagnoseSocialImages(id)).message)}
  catch{setResult("檢查失敗，請稍後查看 Preview 執行紀錄。")}
  finally{setBusy(false)}
 }}>{busy?"檢查中…":"檢查圖片公開網址（不會發文）"}</button>{result?<p role="status" className="notice">{result}</p>:null}</div>;
}