"use client";
import {useMemo,useState} from "react";
import {importOfficialXls,type ImportedOfficialRow} from "@/lib/real-price/official-xls-import";
const VERSION="V1.1 2026-11-08", PER_PAGE=4;
const standards=[
["資料及數量","本報告依內政部匯出Excel原始順序取前50筆，不額外刪選或調整排序；超過50筆不顯示。本限制係本公司作業規則，不是內政部法定筆數。"],
["區域與時間","使用者先於內政部地圖圈選及設定條件後匯出Excel；檔案不附完整圈選幾何邊界，故需註明查詢範圍和下載條件。"],
["不同物件不能直接類比","透天、大樓、華廈、預售及土地的單價基礎不同；屋齡、臨路、土地條件及生活圈不同亦可能使價格不可直接相比。"],
["官方備註","完整揭露原始備註；親友、持分、未登記建物、增建、法拍、協議價購與解約等特殊條件，可能影響價格代表性。"],
["欄位與限制","樓高為總樓層數；地坪與建坪取自官方Excel及相關工作表。缺資料時標示未提供。本報告提供歷史成交資訊，並非正式不動產估價或不動產說明書。"]
] as const;
const split=<T,>(arr:T[],size:number)=>{const result:T[][]=[];for(let i=0;i<arr.length;i+=size)result.push(arr.slice(i,i+size));return result;};
const base={padding:"9px",border:"1px solid #cbd5e1",borderRadius:6,width:"100%",boxSizing:"border-box" as const};
const label=(name:string,control:React.ReactNode)=><label style={{fontSize:13,fontWeight:600}}>{name}<div style={{marginTop:5}}>{control}</div></label>;
export default function RealPriceReportBuilder(){
 const [items,setItems]=useState<ImportedOfficialRow[]>([]);
 const [fileName,setFileName]=useState(""),[total,setTotal]=useState(0),[omitted,setOmitted]=useState(0),[invalid,setInvalid]=useState(0);
 const [error,setError]=useState(""),[loading,setLoading]=useState(false);
 const [subject,setSubject]=useState(""),[area,setArea]=useState(""),[description,setDescription]=useState("");
 const [reportNo,setReportNo]=useState(""),[analyst,setAnalyst]=useState(""),[date,setDate]=useState("2026-11-08");
 const [buyer,setBuyer]=useState(true),[seller,setSeller]=useState(false);
 const sets=([{id:"buyer",name:"買方",selected:buyer},{id:"seller",name:"賣方",selected:seller}]).filter(p=>p.selected);
 const blocks=useMemo(()=>split(items,PER_PAGE),[items]);
 const canPrint=!!(items.length&&!invalid&&sets.length&&subject.trim()&&area.trim()&&reportNo.trim()&&analyst.trim());
 async function onFile(file:File|undefined){
   if(!file)return;setLoading(true);setItems([]);setError("");
   try{const r=await importOfficialXls(file);setItems(r.rows);setFileName(r.filename);setTotal(r.totalInSource);setOmitted(r.omitted);setInvalid(r.skipped);
     if(r.skipped)setError("官方檔案前50筆有"+r.skipped+"筆日期、價格或位置無法解析；為避免遺漏，請核對原檔後再輸出。");
   }catch(e){setError(e instanceof Error?e.message:"Excel無法解析");}
   finally{setLoading(false);}
 }
 return <main className="rp-bulk" style={{maxWidth:1160,margin:"0 auto",padding:20}}>
 <style>{'.rp-bulk .panel{background:white;padding:20px;margin-bottom:16px;border:1px solid #d4dee5;border-radius:10px}.rp-bulk .fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:13px}.rp-bulk .paper{background:white;color:#183449;width:210mm;min-height:297mm;box-sizing:border-box;padding:13mm;margin:16px auto;box-shadow:0 3px 16px #0002;font-family:Arial,"Noto Sans TC",sans-serif;overflow-wrap:anywhere}.rp-bulk .paper h2{font-size:19px;margin:0 0 10px}.rp-bulk .paper p,.rp-bulk .paper td,.rp-bulk .paper th{font-size:10.5px;line-height:1.6}.rp-bulk .paper table{width:100%;border-collapse:collapse}.rp-bulk .paper td,.rp-bulk .paper th{border:1px solid #c6d5de;padding:7px;text-align:left;vertical-align:top}.rp-bulk .paper th{background:#eef4f7}.rp-bulk .muted{font-size:10px;color:#536e80}.rp-bulk .standard{border-bottom:1px solid #d5dee5;padding:10px 0}.rp-bulk .signature{border:1px solid #aebec9;padding:14px;margin-top:24px}@page{size:A4;margin:0}@media(max-width:800px){.rp-bulk .paper{width:100%;padding:15px}}@media print{body *{visibility:hidden!important}.rp-bulk,.rp-bulk .paper,.rp-bulk .paper *{visibility:visible!important}.rp-bulk{max-width:none!important;margin:0!important;padding:0!important}.rp-bulk .panel,.rp-bulk .intro{display:none!important}.rp-bulk .paper{width:210mm!important;min-height:297mm!important;margin:0!important;padding:12mm!important;box-shadow:none!important;break-after:page;page-break-after:always}.rp-bulk .paper:last-child{break-after:auto;page-break-after:auto}.rp-bulk .paper tr,.rp-bulk .standard,.rp-bulk .signature{break-inside:avoid;page-break-inside:avoid}}'}</style>
 <div className="intro"><h1>實價登錄成交行情報告</h1><p>內政部Excel上傳後，直接依官方檔案原順序取前50筆，不再二次篩選。可勾選買方／賣方，分別產生當事人留存及經紀人留存版本。</p></div>
 <section className="panel"><h2>一、上傳內政部官方 Excel</h2>
   <input type="file" accept=".xls,application/vnd.ms-excel" disabled={loading} onChange={e=>{void onFile(e.currentTarget.files?.[0]);e.currentTarget.value="";}}/>
   <p>{loading?"解析中…":fileName?"已匯入："+fileName+"；總"+total+"筆，前50筆中可讀取"+items.length+"筆，超過"+omitted+"筆不顯示。":"請上傳內政部網站下載的 .xls 檔案。"}</p>
   {error?<p style={{color:"#9a3412",fontWeight:700}}>{error}</p>:null}
 </section>
 <section className="panel"><h2>二、報告與交付對象</h2>
 <div className="fields">
 {label("案名／比較標的",<input style={base} value={subject} onChange={e=>setSubject(e.target.value)}/>)}
 {label("地圖圈選範圍／生活圈",<input style={base} value={area} onChange={e=>setArea(e.target.value)}/>)}
 {label("報告編號",<input style={base} value={reportNo} onChange={e=>setReportNo(e.target.value)}/>)}
 {label("經紀人／製作人",<input style={base} value={analyst} onChange={e=>setAnalyst(e.target.value)}/>)}
 {label("製作日期",<input type="date" style={base} value={date} onChange={e=>setDate(e.target.value)}/>)}
 </div>
 <p>{label("內政部查詢條件補充（選填）",<textarea style={{...base,minHeight:55}} value={description} onChange={e=>setDescription(e.target.value)}/>)}</p>
 <div style={{display:"flex",gap:24,alignItems:"center",flexWrap:"wrap",margin:"12px 0"}}><strong>交付對象（勾選）</strong>
 <label><input type="checkbox" checked={buyer} onChange={e=>setBuyer(e.target.checked)}/> 買方</label>
 <label><input type="checkbox" checked={seller} onChange={e=>setSeller(e.target.checked)}/> 賣方</label></div>
 <p>每個勾選對象各產生「當事人留存」與「經紀人留存」兩套獨立文件，最後一頁分別簽收，買賣雙方不會簽在同一張。</p>
 <button type="button" disabled={!canPrint||loading} onClick={()=>window.print()} style={{background:"#173b55",color:"white",border:0,borderRadius:7,padding:"11px 17px",cursor:"pointer"}}>列印／另存PDF（{sets.length*2*(blocks.length+1)}頁）</button>
 <p style={{fontSize:12,color:"#536e80"}}>每頁最多4筆成交，全部最多50筆，報告自動增加頁數；前50筆有無法解析的資料時禁止輸出。</p>
 </section>
 {items.length>0&&sets.flatMap(party=>(["當事人留存","經紀人留存"] as const).flatMap(copy=>[
  ...blocks.map((block,page)=><article className="paper" key={party.id+copy+page}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8}}><h2>不動產成交行情參考報告</h2><b>{party.name}｜{copy}</b></div>
    <div style={{height:4,background:"#b59a66"}}/>
    <p><b>標的：</b>{subject||"未填"}　<b>生活圈：</b>{area||"未填"}</p>
    <p><b>報告：</b>{reportNo||"未填"}　<b>日期：</b>{date}　<b>製作：</b>{analyst||"未填"}</p>
    <p className="muted">官方來源：{fileName}；原始{total}筆；取前50筆，超過{omitted}筆不顯示。{description}</p>
    <h3>官方成交資料｜第{page*PER_PAGE+1}至{page*PER_PAGE+block.length}筆</h3>
    <table><thead><tr><th style={{width:"17%"}}>日期／型態</th><th style={{width:"32%"}}>地點、樓高、屋齡、地建坪</th><th style={{width:"15%"}}>總價</th><th>官方備註</th></tr></thead><tbody>
    {block.map((r,i)=><tr key={r.sourceId}>
      <td>{r.date}<div>{r.kind}</div><span className="muted">第{page*PER_PAGE+i+1}筆</span></td>
      <td>{r.area}<div className="muted">樓高：{r.floorCount||"未提供"}　屋齡：{r.buildingAge==null?"未提供":r.buildingAge+"年"}</div><div className="muted">地坪：{r.landPing==null?"未提供":r.landPing+"坪"}　建坪：{r.buildingPing==null?"未提供":r.buildingPing+"坪"}</div></td>
      <td>{r.price}萬元</td>
      <td>{r.special?<b style={{color:"#9a3412"}}>特殊交易注意</b>:null}<div>{r.note||"官方備註空白"}</div></td>
    </tr>)}</tbody></table>
    <p className="muted">本表為官方匯出資料原順序，未再作同質性篩選。不同產品或特殊交易不一定可直接類比。</p>
    <p className="muted">第{page+1}／{blocks.length+1}頁｜{party.name} {copy}</p>
  </article>),
  <article className="paper" key={party.id+copy+"sign"}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8}}><h2>成交資料選取標準暨簽收紀錄</h2><b>{party.name}｜{copy}</b></div>
    <div style={{height:4,background:"#b59a66"}}/>
    <p className="muted">報告編號：{reportNo||"未填"}｜選案標準：{VERSION}</p>
    {standards.map(([heading,body],i)=><div className="standard" key={heading}><h3>{i+1}、{heading}</h3><p>{body}</p></div>)}
    <div className="signature">
      <strong>成交行情資料交付與簽收</strong>
      <p>交付對象：{party.id==="buyer"?"☑ 買方　□ 賣方":"□ 買方　☑ 賣方"}</p>
      <p>本聯留存：{copy==="當事人留存"?"☑ 當事人留存　□ 經紀人留存":"□ 當事人留存　☑ 經紀人留存"}</p>
      <p>本人確認已收到本報告及相關說明；簽收僅證明收件，不代表同意所列價格。</p>
      <p>{party.name}簽名：_______________________　交付日期：________________</p>
      <p>交付經紀人：_____________________　交付方式：________________</p>
    </div>
    <p className="muted">資料頁及本簽收頁應整套保留。第{blocks.length+1}／{blocks.length+1}頁。</p>
  </article>
 ]))}
 </main>;
}
