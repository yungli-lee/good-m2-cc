"use client";
import {useEffect, useState, type FormEvent, type CSSProperties, type ReactNode} from "react";

const counties=["彰化縣","臺北市","新北市","桃園市","臺中市","臺南市","高雄市","基隆市","新竹市","嘉義市","新竹縣","苗栗縣","南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
type Detail={detail_type:string;section_name?:string|null;parcel_number?:string|null;building_number?:string|null;detail_area_sqm?:number|null};
type Result={details?:Detail[];id:number;county:string;district:string;transaction_date:string;target_category:string;total_price_ntd:number|null;land_area_sqm:number|null;building_area_sqm:number|null;road_name?:string|null;land_section?:string|null;location_display?:string|null;unit_price_ntd_per_sqm?:number|null};
const targetOptions=[{id:"house_land",name:"房地"},{id:"land",name:"土地"},{id:"building",name:"建物"},{id:"parking",name:"車位"}];
const inputStyle:CSSProperties={width:"100%",minHeight:42,border:"1px solid #cbd5e1",borderRadius:8,padding:"8px 10px",background:"white",color:"#17243b"};
const gridStyle:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12};
export function RealPriceSearch(){
 const [county,setCounty]=useState(""),[district,setDistrict]=useState("");
 const [expandedId,setExpandedId]=useState<number|null>(null);
 const [districtOptions,setDistrictOptions]=useState<string[]>([]);
 const [districtLoading,setDistrictLoading]=useState(false),[districtFallback,setDistrictFallback]=useState(false);
 const [dataset,setDataset]=useState("sale"),[targets,setTargets]=useState<string[]>(["house_land","land"]);
 const [road,setRoad]=useState(""),[section,setSection]=useState(""),[period,setPeriod]=useState("3");
 const [priceMin,setPriceMin]=useState(""),[priceMax,setPriceMax]=useState("");
 const [areaMin,setAreaMin]=useState(""),[areaMax,setAreaMax]=useState(""),[ageMax,setAgeMax]=useState("");
 const [advanced,setAdvanced]=useState(false),[page,setPage]=useState(1);
 const [previewSample,setPreviewSample]=useState(false);
 const [queryString,setQueryString]=useState(""),[rows,setRows]=useState<Result[]>([]),[total,setTotal]=useState(0);
 const [status,setStatus]=useState<"idle"|"loading"|"ok"|"empty"|"unavailable"|"error">("idle"),[message,setMessage]=useState("");
 useEffect(()=>{
   if(!county){setDistrictOptions([]);setDistrictFallback(false);setDistrictLoading(false);return;}
   const controller=new AbortController();
   setDistrictOptions([]);setDistrictLoading(true);setDistrictFallback(false);
   fetch("/api/public/real-price-districts?"+new URLSearchParams({county}),{signal:controller.signal})
     .then(async response=>{
       if(!response.ok)throw new Error("lookup_failed");
       return response.json() as Promise<{districts?:string[]}>;
     }).then(payload=>{
       if(controller.signal.aborted)return;
       if(!Array.isArray(payload.districts)||!payload.districts.length)throw new Error("districts_missing");
       setDistrictOptions(payload.districts);
     }).catch(()=>{
       if(!controller.signal.aborted)setDistrictFallback(true);
     }).finally(()=>{if(!controller.signal.aborted)setDistrictLoading(false);});
   return ()=>controller.abort();
 },[county]);
 async function load(query:string,nextPage:number){
  setStatus("loading");setMessage("");
  const p=new URLSearchParams(query);p.set("page",String(nextPage));
  try{
    const response=await fetch("/api/public/real-price?"+p.toString(),{cache:"no-store"});
    const payload=await response.json() as {data?:Result[];total?:number;message?:string;error?:string;preview_sample?:boolean};
    if(response.status===503 && payload.error==="not_ready"){setRows([]);setTotal(0);setStatus("unavailable");return;}
    if(!response.ok)throw new Error(payload.message||"查詢暫時無法使用");
    const list=Array.isArray(payload.data)?payload.data:[];
    setRows(list);setExpandedId(null);setTotal(payload.total??0);setPreviewSample(payload.preview_sample===true);setStatus(list.length?"ok":"empty");
  }catch(e){setRows([]);setTotal(0);setMessage(e instanceof Error?e.message:"查詢服務暫時無法使用");setStatus("error");}
 }
 function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault(); const p=new URLSearchParams({dataset});
   if(county)p.set("county",county);
   if(district)p.set("district",district);
   targets.forEach(x=>p.append("target",x));
   if(road.trim())p.set("road",road.trim());if(section.trim())p.set("section",section.trim());
   if(period!=="all"){const date=new Date();date.setFullYear(date.getFullYear()-Number(period));p.set("from",date.toISOString().slice(0,10));}
   if(priceMin)p.set("min_price",String(Number(priceMin)*10000));
   if(priceMax)p.set("max_price",String(Number(priceMax)*10000));
   if(areaMin)p.set("min_area_sqm",String(Number(areaMin)*3.305785));
   if(areaMax)p.set("max_area_sqm",String(Number(areaMax)*3.305785));
   if(ageMax&&dataset!=="presale")p.set("max_age",ageMax);
   const str=p.toString();setQueryString(str);setPage(1);void load(str,1);
 }
 function changePage(next:number){setPage(next);void load(queryString,next);}
 const f=(label:string,element:ReactNode)=><label style={{display:"grid",gap:5,fontSize:14,fontWeight:600}}>{label}{element}</label>;
 return <main style={{maxWidth:1120,margin:"0 auto",padding:"32px 16px 80px",color:"#1e293b"}}>
  <h1 style={{fontSize:"clamp(25px,4vw,36px)",fontWeight:750}}>全國實價登錄查詢</h1>
  <p style={{color:"#64748b",margin:"8px 0 22px"}}>全國各縣市皆可查詢｜可依地區篩選｜買賣・預售屋・租賃</p>
  <form onSubmit={submit} autoComplete="off" style={{padding:20,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,display:"grid",gap:17}}>
   <div style={gridStyle}>
    {f("資料類型",<select style={inputStyle} value={dataset} onChange={e=>setDataset(e.target.value)}><option value="sale">不動產買賣</option><option value="presale">預售屋</option><option value="rental">租賃</option></select>)}
    {f("縣市",<select style={inputStyle} value={county} onChange={e=>{setCounty(e.target.value);setDistrict("");}}><option value="">全國（全部縣市）</option>{counties.map(c=><option key={c} value={c}>{c}</option>)}</select>)}
    {f("鄉鎮市區",!county?<input style={inputStyle} value={district} onChange={e=>setDistrict(e.target.value)} placeholder="全國全部行政區（可輸入名稱）" maxLength={80}/>:districtLoading?<select style={inputStyle} disabled><option>讀取行政區中…</option></select>:districtFallback?<input style={inputStyle} value={district} onChange={e=>setDistrict(e.target.value)} placeholder="行政區服務暫時無法使用，請輸入區名" maxLength={80}/>:<select style={inputStyle} value={district} onChange={e=>setDistrict(e.target.value)}><option value="">全部鄉鎮市區</option>{districtOptions.map(d=><option key={d} value={d}>{d}</option>)}</select>)}
    {f("交易期間",<select style={inputStyle} value={period} onChange={e=>setPeriod(e.target.value)}>{["1","2","3","5","10","all"].map(v=><option value={v} key={v}>{v==="all"?"全部已發布資料":`近 ${v} 年`}</option>)}</select>)}
   </div>
   <fieldset style={{border:0,padding:0}}>
    <legend style={{fontWeight:700,marginBottom:8}}>交易標的（可複選）</legend>
    <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>{targetOptions.map(t=><label key={t.id} style={{display:"inline-flex",alignItems:"center",gap:6}}><input type="checkbox" checked={targets.includes(t.id)} onChange={e=>setTargets(old=>e.target.checked?[...old,t.id]:old.filter(x=>x!==t.id))}/>{t.name}</label>)}</div>
    <details style={{marginTop:10,fontSize:13,color:"#475569"}}><summary style={{cursor:"pointer"}}>房地包含什麼？</summary><p>房地包含「土地＋建物」及「土地＋建物＋車位」。房地附帶車位仍算一筆；勾選「車位」另外查詢獨立車位交易。</p></details>
   </fieldset>
   <div style={gridStyle}>
    {f("道路名稱",<input style={inputStyle} value={road} maxLength={80} placeholder="例如：彰水路" onChange={e=>setRoad(e.target.value)}/>)}
    {f("地段",<input style={inputStyle} value={section} maxLength={80} placeholder="例如：秀水段" onChange={e=>setSection(e.target.value)}/>)}
   </div>
   <button type="button" aria-expanded={advanced} onClick={()=>setAdvanced(x=>!x)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,textAlign:"left",color:"#1d4ed8",background:"#eaf1ff",border:"1px solid #c7d7f7",borderRadius:9,padding:"11px 14px",fontWeight:700,cursor:"pointer"}}><span>進階條件（總價／面積／屋齡）</span><span aria-hidden="true">{advanced?"−":"＋"}</span></button>
   {advanced&&<div style={{...gridStyle,padding:"12px 2px 4px"}}>
    {f("最低價格（萬元）",<input type="number" min="0" style={inputStyle} value={priceMin} onChange={e=>setPriceMin(e.target.value)}/>)}
    {f("最高價格（萬元）",<input type="number" min="0" style={inputStyle} value={priceMax} onChange={e=>setPriceMax(e.target.value)}/>)}
    {f("最小面積（坪）",<input type="number" min="0" style={inputStyle} value={areaMin} onChange={e=>setAreaMin(e.target.value)}/>)}
    {f("最大面積（坪）",<input type="number" min="0" style={inputStyle} value={areaMax} onChange={e=>setAreaMax(e.target.value)}/>)}
    {dataset!=="presale"&&f("最大屋齡（年）",<input type="number" min="0" style={inputStyle} value={ageMax} onChange={e=>setAgeMax(e.target.value)}/>)}
   </div>}
   <button type="submit" style={{background:"#1d4ed8",color:"white",borderRadius:8,padding:"12px 20px",fontWeight:700}}>查詢成交紀錄</button>
  </form>
  <section aria-live="polite" style={{marginTop:22}}>
   {status==="idle"&&<p style={{color:"#64748b"}}>選擇條件後按「查詢成交紀錄」。未完成驗收的資料不會顯示。</p>}
   {status==="loading"&&<p>查詢中…</p>}
   {status==="unavailable"&&<div role="status" style={{padding:18,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10}}><strong>查詢介面已開放預覽，成交資料尚未開放</strong><p style={{margin:"8px 0 0",color:"#475569"}}>目前可以操作篩選條件並檢查版面。資料完成驗證與發布後，才會顯示真實成交紀錄。</p></div>}
   {status==="error"&&<p role="alert" style={{padding:15,border:"1px solid #fecaca",borderRadius:8}}>{message}</p>}
   {status==="empty"&&<p>在本次可查詢的資料範圍內，沒有符合條件的紀錄。</p>}
   {status==="ok"&&<>{previewSample&&<p role="status" style={{padding:12,background:"#fff7ed",border:"1px solid #fdba74",borderRadius:8}}>Preview 驗收資料：目前僅顯示兩筆指定的 staging 官方交易紀錄，尚未完成正式批次驗證，不代表完整市場行情。</p>}<p>符合條件：{total.toLocaleString("zh-TW")} 筆</p><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:670}}><thead><tr>{["交易日期","縣市／行政區","標的","地段地號／門牌","總價（萬元）","土地／建物坪數","明細"].map(h=><th key={h} style={{textAlign:"left",padding:10,borderBottom:"1px solid #cbd5e1"}}>{h}</th>)}</tr></thead><tbody>{rows.map(r=>[<tr key={r.id}><td style={{padding:10}}>{r.transaction_date}</td><td>{r.county} {r.district}</td><td>{({house_land:"房地",land:"土地",building:"建物",parking:"車位"} as Record<string,string>)[r.target_category]||r.target_category}</td><td>{r.location_display||[r.road_name,r.land_section].filter(Boolean).join("／")||"未提供"}</td><td>{r.total_price_ntd==null?"—":(r.total_price_ntd/10000).toLocaleString("zh-TW")}</td><td>{[r.land_area_sqm,r.building_area_sqm].map(a=>a==null?"—":(a/3.305785).toFixed(2)).join("／")}</td><td><button type="button" onClick={()=>setExpandedId(old=>old===r.id?null:r.id)} aria-expanded={expandedId===r.id} style={{color:"#1d4ed8",fontWeight:600,whiteSpace:"nowrap"}}>{expandedId===r.id?"收合":"查看明細"}</button></td></tr>,
    expandedId===r.id?<tr key={String(r.id)+"-detail"}><td colSpan={7} style={{padding:"14px 18px",background:"#f1f5f9",whiteSpace:"normal"}}><strong>交易組合明細</strong><div style={{marginTop:8}}>主檔總價：{r.total_price_ntd==null?"—":(r.total_price_ntd/10000).toLocaleString("zh-TW")+" 萬元"}（整筆交易，非個別地號價格）</div>{r.details?.length?<ul style={{paddingLeft:22,marginTop:8}}>{r.details.map((d,i)=><li key={i} style={{marginBottom:6}}>{({land:"土地",building:"建物",parking:"車位"} as Record<string,string>)[d.detail_type]||d.detail_type}：{[d.section_name,d.parcel_number?d.parcel_number+"（原始地號）":"",d.building_number?d.building_number+"（建號）":""].filter(Boolean).join(" ")}{d.detail_area_sqm!=null?"｜面積 "+(Number(d.detail_area_sqm)/3.305785).toFixed(2)+" 坪":""}</li>)}</ul>:<p style={{marginTop:8}}>此筆交易的組合明細尚未提供。</p>}</td></tr>:null])}</tbody></table></div><div style={{display:"flex",gap:12,alignItems:"center",marginTop:18}}><button disabled={page<=1} onClick={()=>changePage(page-1)}>上一頁</button><span>第 {page} 頁</span><button disabled={page*20>=total} onClick={()=>changePage(page+1)}>下一頁</button></div></>}
  </section>
 </main>;
}
