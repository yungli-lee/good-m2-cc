"use client";
import {useEffect,useRef, useState, type FormEvent, type CSSProperties, type ReactNode} from "react";

import { parseSearchDate } from "@/lib/real-price/date-range";
import { hasExplicitLane } from "@/lib/real-price/road-search";

const counties=["彰化縣","臺北市","新北市","桃園市","臺中市","臺南市","高雄市","基隆市","新竹市","嘉義市","新竹縣","苗栗縣","南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
type Detail={ownership_share_numerator?:number|null;ownership_share_denominator?:number|null;parking_type?:string|null;parking_price_ntd?:number|null;parking_floor?:string|null;share_warning?:string|null;detail_type:string;section_name?:string|null;parcel_number?:string|null;building_number?:string|null;detail_area_sqm?:number|null};
type Result={history_lookup_key?:string|null;official_note?:string|null;details?:Detail[];id:number;county:string;district:string;transaction_date:string;target_category:string;total_price_ntd:number|null;land_area_sqm:number|null;building_area_sqm:number|null;road_name?:string|null;land_section?:string|null;location_display?:string|null;unit_price_ntd_per_sqm?:number|null;building_age_years?:number|null;building_pattern?:string|null;floor_display?:string|null};
const targetOptions=[{id:"house_land",name:"房地"},{id:"land",name:"土地"},{id:"building",name:"建物"},{id:"parking",name:"車位"}];
const inputStyle:CSSProperties={width:"100%",minHeight:42,border:"1px solid #cbd5e1",borderRadius:8,padding:"8px 10px",background:"white",color:"#17243b"};
const gridStyle:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12};
const displayLocation=(value?:string|null)=>value?value.normalize("NFKC").replace(/(\\d)\\s+(?=\\d)/g,"$1").replace(/(\\d)\\s+(?=[巷弄號樓])/g,"$1"):"未提供";
const formatParcel=(value?:string|null)=>{if(!value)return "";const m=/^(\d{4})(\d{4})$/.exec(value);return m?String(Number(m[1]))+(Number(m[2])?"-"+Number(m[2]):""):value;};
// Keep transaction rows readable; never alter the official raw location or underlying details.
const compactLocation=(r:Result)=>{
 const raw=displayLocation(r.location_display||[r.road_name,r.land_section].filter(Boolean).join("／"));
 const segments=raw.split(/[／/]/).map(x=>x.trim()).filter(Boolean);
 const addresses=[...new Set(segments.filter(x=>/[0-9０-９一二三四五六七八九十]+(?:之[0-9０-９]+)?號/.test(x)&&!/地號/.test(x)))];
 const sectionNames=[...new Set((r.details||[]).filter(d=>d.detail_type==="land").map(d=>d.section_name?.trim()).filter((s):s is string=>Boolean(s)))];
 const main=addresses[0]||segments[0]||raw;
 const suffix=[addresses.length>1?`另含${addresses.length-1}址`:"",sectionNames.length>1?`跨${sectionNames.length}地段`:""].filter(Boolean);
 return {main,summary:suffix.join("・")};
};
const noteLabel=(r:Result)=>r.official_note?.trim()?"交易備註":"";
const categoryLabel=(v:string)=>({house_land:"房地",land:"土地",building:"建物",parking:"車位"} as Record<string,string>)[v]||v;
export function RealPriceSearch(){
 const [county,setCounty]=useState(""),[district,setDistrict]=useState("");
 const [expandedId,setExpandedId]=useState<number|null>(null);
 const [districtOptions,setDistrictOptions]=useState<string[]>([]);
 const [districtLoading,setDistrictLoading]=useState(false),[districtFallback,setDistrictFallback]=useState(false);
 const [dataset,setDataset]=useState("sale"),[targets,setTargets]=useState<string[]>(["house_land","land"]);
 const [road,setRoad]=useState(""),[section,setSection]=useState(""),[period,setPeriod]=useState("3");
 const [sectionOptions,setSectionOptions]=useState<string[]>([]);
 const [sectionLoading,setSectionLoading]=useState(false),[sectionUnavailable,setSectionUnavailable]=useState(false);
 const filteredSections=sectionOptions.filter(name=>name.includes(section.trim()));
 useEffect(()=>{
   setSection("");setSectionOptions([]);setSectionUnavailable(false);
   if(!county||!district){setSectionLoading(false);return;}
   const controller=new AbortController();
   const timer=setTimeout(()=>{setSectionLoading(false);setSectionUnavailable(true);controller.abort();},9000);
   setSectionLoading(true);
   fetch("/api/public/real-price-sections?"+new URLSearchParams({county,district}),{signal:controller.signal})
     .then(async response=>{if(!response.ok)throw new Error("sections_unavailable");return response.json() as Promise<{sections?:string[]}>;})
     .then(payload=>{if(!controller.signal.aborted){if(!payload.sections?.length)throw new Error("sections_missing");setSectionOptions(payload.sections);}})
     .catch(()=>{if(!controller.signal.aborted)setSectionUnavailable(true);})
     .finally(()=>{clearTimeout(timer);if(!controller.signal.aborted)setSectionLoading(false);});
   return ()=>{clearTimeout(timer);controller.abort();};
 },[county,district]);
 const [dateFrom,setDateFrom]=useState(""),[dateTo,setDateTo]=useState("");
 const [dateError,setDateError]=useState("");
 const [includeLanes,setIncludeLanes]=useState(true);
 const explicitLane=hasExplicitLane(road);
 const [priceMin,setPriceMin]=useState(""),[priceMax,setPriceMax]=useState("");
 const [areaMin,setAreaMin]=useState(""),[areaMax,setAreaMax]=useState(""),[ageMax,setAgeMax]=useState("");
 const [advanced,setAdvanced]=useState(false),[page,setPage]=useState(1);
 const [pageInput,setPageInput]=useState("1");
 const [previewSample,setPreviewSample]=useState(false);
 const [queryString,setQueryString]=useState(""),[rows,setRows]=useState<Result[]>([]),[total,setTotal]=useState(0);
 const totalPages=Math.max(1,Math.ceil(total/20));
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
 const searchRequest=useRef<AbortController|null>(null);
 useEffect(()=>()=>searchRequest.current?.abort(),[]);
 async function load(query:string,nextPage:number){
  searchRequest.current?.abort();
  const controller=new AbortController();searchRequest.current=controller;
  const timeout=setTimeout(()=>controller.abort(),20000);
  setStatus("loading");setMessage("");
  const p=new URLSearchParams(query);p.set("page",String(nextPage));
  try{
    const response=await fetch("/api/public/real-price?"+p.toString(),{cache:"no-store",signal:controller.signal});
    const payload=await response.json() as {data?:Result[];total?:number;message?:string;error?:string;preview_sample?:boolean};
    if(response.status===503 && payload.error==="not_ready"){setRows([]);setTotal(0);setStatus("unavailable");return;}
    if(!response.ok)throw new Error(payload.message||"查詢暫時無法使用");
    if(searchRequest.current!==controller)return;
    const list=Array.isArray(payload.data)?payload.data:[];
    setRows(list);setExpandedId(null);setTotal(payload.total??0);setPreviewSample(payload.preview_sample===true);setStatus(list.length?"ok":"empty");
  }catch(e){if(searchRequest.current!==controller)return;setRows([]);setTotal(0);setMessage(controller.signal.aborted?"查詢超過20秒，服務目前回應緩慢，請稍後再試。這不代表沒有符合的交易。":e instanceof Error?e.message:"查詢服務暫時無法使用");setStatus("error");}
  finally{clearTimeout(timeout);}
 }
 function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault(); const p=new URLSearchParams({dataset});
   if(county)p.set("county",county);
   if(district)p.set("district",district);
   targets.forEach(x=>p.append("target",x));
   if(road.trim()){p.set("road",road.trim());p.set("include_lanes",String(includeLanes));}if(section.trim())p.set("section",section.trim());
   setDateError("");
   if(period==="custom"){
     const from=parseSearchDate(dateFrom),to=parseSearchDate(dateTo);
     if(!from||!to){setDateError("請輸入有效日期，例如民國1100101或西元2021-01-01。");return;}
     if(from>to){setDateError("起始日期不可晚於結束日期。");return;}
     p.set("from",from);p.set("to",to);
   } else if(period!=="all"){const date=new Date();date.setFullYear(date.getFullYear()-Number(period));p.set("from",date.toISOString().slice(0,10));}
   if(priceMin)p.set("min_price",String(Number(priceMin)*10000));
   if(priceMax)p.set("max_price",String(Number(priceMax)*10000));
   if(areaMin)p.set("min_area_sqm",String(Number(areaMin)*3.305785));
   if(areaMax)p.set("max_area_sqm",String(Number(areaMax)*3.305785));
   if(ageMax&&dataset!=="presale")p.set("max_age",ageMax);
   const str=p.toString();setQueryString(str);setPage(1);setPageInput("1");void load(str,1);
 }
 function changePage(next:number){if(!Number.isSafeInteger(next)||next<1||next>totalPages)return;setPage(next);setPageInput(String(next));void load(queryString,next);}
 const details=(r:Result)=><div style={{padding:14,background:"#f1f5f9",borderRadius:8,overflowWrap:"anywhere"}}>
   <strong>成交重點</strong>
   <p style={{margin:"9px 0"}}><b>位置：</b>{displayLocation(r.location_display||[r.road_name,r.land_section].filter(Boolean).join("／"))}</p>
   <p style={{margin:"9px 0"}}><b>總價：</b>{r.total_price_ntd==null?"未提供":(r.total_price_ntd/10000).toLocaleString("zh-TW")+" 萬元"}</p>
   <p style={{margin:"9px 0"}}><b>面積：</b>土地 {r.land_area_sqm==null?"未提供":(r.land_area_sqm/3.305785).toFixed(2)+" 坪"}／建物 {r.building_area_sqm==null?"未提供":(r.building_area_sqm/3.305785).toFixed(2)+" 坪"}</p>
   <p style={{margin:"9px 0"}}><b>建物：</b>{r.building_pattern||"類型未提供"}｜屋齡 {r.building_age_years==null?"未提供":r.building_age_years+" 年"}｜樓層 {r.floor_display||"未提供"}</p>
   {r.official_note&&<p style={{margin:"9px 0",color:"#475569",whiteSpace:"pre-wrap"}}>交易備註：{r.official_note}</p>}
   {r.details&&r.details.length>1&&<p style={{margin:"9px 0",fontSize:13,color:"#64748b"}}>本次含 {r.details.filter(d=>d.detail_type==="land").length} 筆土地、{r.details.filter(d=>d.detail_type==="building").length} 筆建物、{r.details.filter(d=>d.detail_type==="parking").length} 筆車位；總價為整筆交易，不代表個別標的價格。</p>}
   {r.details&&r.details.length>0&&<div style={{marginTop:14}}>
    <strong>土地、建物與車位明細（{r.details.length}筆）</strong>
    <div style={{display:"grid",gap:8,maxHeight:360,overflowY:"auto",marginTop:8}}>
     {r.details.map((d,index)=><div key={index} style={{background:"white",border:"1px solid #cbd5e1",borderRadius:8,padding:10,fontSize:14}}>
      <b>{({land:"土地",building:"建物",parking:"車位"} as Record<string,string>)[d.detail_type]||d.detail_type} {index+1}</b>
      {d.detail_type==="land"&&<><div>{d.section_name||"地段未提供"} {d.parcel_number?formatParcel(d.parcel_number)+"地號":"地號未提供"}</div><div>持分：{d.ownership_share_numerator!=null&&d.ownership_share_denominator!=null?`${d.ownership_share_numerator}／${d.ownership_share_denominator}`:"未提供"}</div>{d.share_warning&&<div style={{color:"#92400e"}}>{d.share_warning}</div>}</>}
      {d.detail_type==="building"&&<div>建號：{d.building_number||"未提供"}</div>}
      {d.detail_type==="parking"&&<><div>類型：{d.parking_type||"未提供"}｜樓層：{d.parking_floor||"未提供"}</div><div>車位價格：{d.parking_price_ntd==null?"未提供":Number(d.parking_price_ntd)===0?"官方填報0元（是否併入總價未另說明）":(Number(d.parking_price_ntd)/10000).toLocaleString("zh-TW")+"萬元"}</div></>}
      <div>面積：{d.detail_area_sqm==null?"未提供":`${Number(d.detail_area_sqm).toLocaleString("zh-TW")}㎡（${(Number(d.detail_area_sqm)/3.305785).toFixed(2)}坪）`}</div>
     </div>)}
    </div>
    <p style={{fontSize:12,color:"#64748b",marginTop:6}}>依官方明細列示；面積沿用官方申報值，不再乘上持分。部分期別可能未提供所有類型明細。</p>
   </div>}

  </div>;
 const f=(label:string,element:ReactNode)=><label style={{display:"grid",gap:5,fontSize:14,fontWeight:600}}>{label}{element}</label>;
 return <main style={{maxWidth:1120,margin:"0 auto",padding:"32px 16px 80px",color:"#1e293b"}}>
  <h1 style={{fontSize:"clamp(25px,4vw,36px)",fontWeight:750}}>全國實價登錄查詢</h1>
  <p style={{color:"#64748b",margin:"8px 0 22px"}}>全國各縣市皆可查詢｜可依地區篩選｜買賣・預售屋・租賃</p>
  <form onSubmit={submit} autoComplete="off" style={{padding:20,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,display:"grid",gap:17}}>
   <div style={gridStyle}>
    {f("資料類型",<select style={inputStyle} value={dataset} onChange={e=>setDataset(e.target.value)}><option value="sale">不動產買賣</option><option value="presale">預售屋</option><option value="rental">租賃</option></select>)}
    {f("縣市",<select style={inputStyle} value={county} onChange={e=>{setCounty(e.target.value);setDistrict("");}}><option value="">全國（全部縣市）</option>{counties.map(c=><option key={c} value={c}>{c}</option>)}</select>)}
    {f("鄉鎮市區",!county?<input style={inputStyle} value={district} onChange={e=>setDistrict(e.target.value)} placeholder="全國全部行政區（可輸入名稱）" maxLength={80}/>:districtLoading?<select style={inputStyle} disabled><option>讀取行政區中…</option></select>:districtFallback?<input style={inputStyle} value={district} onChange={e=>setDistrict(e.target.value)} placeholder="行政區服務暫時無法使用，請輸入區名" maxLength={80}/>:<select style={inputStyle} value={district} onChange={e=>setDistrict(e.target.value)}><option value="">全部鄉鎮市區</option>{districtOptions.map(d=><option key={d} value={d}>{d}</option>)}</select>)}
    {f("交易期間",<select style={inputStyle} value={period} onChange={e=>setPeriod(e.target.value)}>{["1","2","3","5","10","all","custom"].map(v=><option value={v} key={v}>{v==="custom"?"自訂日期區間":v==="all"?"全部已發布資料":`近 ${v} 年`}</option>)}</select>)}
   </div>
   {period==="custom"&&<div>
    <div style={gridStyle}>
     {f("起始日期（含當日）",<input style={inputStyle} value={dateFrom} onChange={e=>setDateFrom(e.target.value)} placeholder="1100101 或 2021-01-01" maxLength={10} required aria-describedby="real-price-date-help"/>)}
     {f("結束日期（含當日）",<input style={inputStyle} value={dateTo} onChange={e=>setDateTo(e.target.value)} placeholder="1131231 或 2024-12-31" maxLength={10} required aria-describedby="real-price-date-help"/>)}
    </div>
    <p id="real-price-date-help" style={{fontSize:12,color:"#64748b",marginTop:8}}>可輸入民國7碼或西元日期。例如1100101～1131231，即2021/01/01～2024/12/31。</p>
    {dateError&&<p role="alert" style={{color:"#b91c1c"}}>{dateError}</p>}
   </div>}
   <fieldset style={{border:0,padding:0}}>
    <legend style={{fontWeight:700,marginBottom:8}}>交易標的（可複選）</legend>
    <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>{targetOptions.map(t=><label key={t.id} style={{display:"inline-flex",alignItems:"center",gap:6}}><input type="checkbox" checked={targets.includes(t.id)} onChange={e=>setTargets(old=>e.target.checked?[...old,t.id]:old.filter(x=>x!==t.id))}/>{t.name}</label>)}</div>
    <details style={{marginTop:10,fontSize:13,color:"#475569"}}><summary style={{cursor:"pointer"}}>房地包含什麼？</summary><p>房地包含「土地＋建物」及「土地＋建物＋車位」。房地附帶車位仍算一筆；勾選「車位」另外查詢獨立車位交易。</p></details>
   </fieldset>
   <div style={gridStyle}>
    <div style={{display:"grid",gap:8}}>
     {f("道路名稱",<input style={inputStyle} value={road} maxLength={80} placeholder="例如：彰鹿路、民族路129巷" onChange={e=>setRoad(e.target.value)}/>)}
     <label style={{display:"flex",alignItems:"center",gap:6,fontSize:14}}><input type="checkbox" checked={includeLanes} disabled={explicitLane} onChange={e=>setIncludeLanes(e.target.checked)}/>包含巷弄</label>
     <span style={{fontSize:12,color:"#64748b"}}>{explicitLane?"已指定巷弄，依輸入範圍查詢。":"未指定路段時，查詢全部路段。"}</span>
    </div>
    <div style={{display:"grid",gap:8,alignContent:"start"}}>
     {f("地段（可輸入或選擇）",<input style={inputStyle} value={section} maxLength={80} placeholder="輸入部分段名，例如：秀水、復興" aria-describedby="section-help" onChange={e=>setSection(e.target.value)}/>)}
     <label style={{display:"grid",gap:5,fontSize:13}}>挑選段名
      <select style={inputStyle} value="" disabled={!county||!district||sectionLoading||!sectionOptions.length} onChange={e=>{if(e.target.value)setSection(e.target.value);}}>
       <option value="">{sectionLoading?"讀取段名中…":!county||!district?"先選縣市與鄉鎮市區":filteredSections.length?`選擇段名（${filteredSections.length}個）`:"沒有符合的選項，可修改關鍵字"}</option>
       {filteredSections.map(name=><option key={name} value={name}>{name}</option>)}
      </select>
     </label>
     <span id="section-help" role="status" style={{fontSize:12,color:"#64748b"}}>{sectionUnavailable?"段名清單暫時無法讀取，仍可直接輸入或留空查詢。":"不知道段名可留空；選好行政區後可下拉挑選，輸入文字可縮小選項。官方段名清單不代表每段皆有已匯入交易。"}</span>
     {section&&<button type="button" onClick={()=>setSection("")} style={{justifySelf:"start",fontSize:13,color:"#1d4ed8"}}>清除段名，查看全部選項</button>}
    </div>
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
   {status==="ok"&&<>{previewSample&&<p role="status" style={{padding:12,background:"#fff7ed",border:"1px solid #fdba74",borderRadius:8}}>資料範圍提醒：目前提供已匯入的當期及部分歷史資料，尚未涵蓋全國全部年度；查無結果不代表沒有交易。</p>}<p>符合條件：{total.toLocaleString("zh-TW")} 筆</p><style>{`
    .real-price-desktop{display:block}
    .real-price-mobile{display:none}
    @media(max-width:720px){
      .real-price-desktop{display:none}
      .real-price-mobile{display:grid;gap:12px}
    }
   `}</style>
   <div className="real-price-desktop" style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",minWidth:1060,tableLayout:"fixed"}}>
     <colgroup><col style={{width:110}}/><col style={{width:125}}/><col style={{width:90}}/><col/><col style={{width:120}}/><col style={{width:140}}/><col style={{width:100}}/></colgroup>
     <thead><tr>{["交易日期","縣市／行政區","標的","地段地號／門牌","總價（萬元）","土地／建物坪數","明細"].map(h=><th key={h} style={{textAlign:"left",padding:10,borderBottom:"1px solid #cbd5e1"}}>{h}</th>)}</tr></thead>
     <tbody>{rows.flatMap(r=>[
       <tr key={r.id} style={{borderBottom:"1px solid #e2e8f0"}}>
        <td style={{padding:10,whiteSpace:"nowrap",verticalAlign:"top"}}>{r.transaction_date}</td><td style={{verticalAlign:"top"}}>{r.county}<br/>{r.district}</td><td style={{whiteSpace:"nowrap",verticalAlign:"top"}}>{categoryLabel(r.target_category)}{noteLabel(r)&&<div style={{fontSize:12,color:"#b45309"}}>{noteLabel(r)}</div>}</td>
        <td style={{overflowWrap:"anywhere",verticalAlign:"top",paddingRight:12}}><span>{compactLocation(r).main}</span>{compactLocation(r).summary&&<div style={{fontSize:12,color:"#64748b",marginTop:4}}>{compactLocation(r).summary}</div>}</td>
        <td>{r.total_price_ntd==null?"—":(r.total_price_ntd/10000).toLocaleString("zh-TW")}</td>
        <td>{[r.land_area_sqm,r.building_area_sqm].map(a=>a==null?"—":(a/3.305785).toFixed(2)).join("／")}</td>
        <td><button type="button" onClick={()=>setExpandedId(old=>old===r.id?null:r.id)} aria-expanded={expandedId===r.id} style={{color:"#1d4ed8",fontWeight:600,whiteSpace:"nowrap"}}>{expandedId===r.id?"收合":"查看明細"}</button></td>
       </tr>,
       ...(expandedId===r.id?[<tr key={String(r.id)+"-detail"}><td colSpan={7}>{details(r)}</td></tr>]:[])
      ])}</tbody>
    </table>
   </div>
   <div className="real-price-mobile">
    {rows.map(r=><article key={r.id} style={{border:"1px solid #cbd5e1",borderRadius:12,padding:14,background:"white",minWidth:0,overflowWrap:"anywhere"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
       <strong>{r.transaction_date}</strong><span>{categoryLabel(r.target_category)}｜{r.county} {r.district}</span>{noteLabel(r)&&<span style={{width:"100%",fontSize:13,color:"#b45309"}}>{noteLabel(r)}</span>}
      </div>
      <p style={{margin:"10px 0",fontWeight:650}}><span>{compactLocation(r).main}</span>{compactLocation(r).summary&&<div style={{fontSize:12,color:"#64748b",marginTop:4}}>{compactLocation(r).summary}</div>}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:14}}>
       <div>總價<div style={{fontWeight:700}}>{r.total_price_ntd==null?"—":(r.total_price_ntd/10000).toLocaleString("zh-TW")+" 萬"}</div></div>
       <div>土地／建物<div style={{fontWeight:700}}>{[r.land_area_sqm,r.building_area_sqm].map(a=>a==null?"—":(a/3.305785).toFixed(2)).join("／")} 坪</div></div>
      </div>
      <button type="button" onClick={()=>setExpandedId(old=>old===r.id?null:r.id)} aria-expanded={expandedId===r.id} style={{marginTop:12,color:"#1d4ed8",fontWeight:700}}>{expandedId===r.id?"收合明細 ▲":"查看交易組合明細 ▼"}</button>
      {expandedId===r.id&&<div style={{marginTop:10}}>{details(r)}</div>}
    </article>)}
   </div><nav aria-label="成交紀錄分頁" style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginTop:18}}>
    <button type="button" disabled={page<=1} onClick={()=>changePage(1)}>首頁</button>
    <button type="button" disabled={page<=1} onClick={()=>changePage(page-1)}>上一頁</button>
    <span aria-current="page">第 {page.toLocaleString("zh-TW")} 頁／共 {totalPages.toLocaleString("zh-TW")} 頁</span>
    <button type="button" disabled={page>=totalPages} onClick={()=>changePage(page+1)}>下一頁</button>
    <button type="button" disabled={page>=totalPages} onClick={()=>changePage(totalPages)}>末頁</button>
    <form onSubmit={e=>{e.preventDefault();changePage(Number(pageInput));}} style={{display:"flex",alignItems:"center",gap:8}}>
     <label htmlFor="real-price-page">跳至頁次</label>
     <input id="real-price-page" type="number" min={1} max={totalPages} step={1} required value={pageInput} onChange={e=>setPageInput(e.target.value)} style={{...inputStyle,width:90}}/>
     <button type="submit">跳頁</button>
    </form>
   </nav></>}
  </section>
 </main>;
}
