"use client";
import {useState, type FormEvent, type CSSProperties, type ReactNode} from "react";

const counties=["彰化縣","臺北市","新北市","桃園市","臺中市","臺南市","高雄市","基隆市","新竹市","嘉義市","新竹縣","苗栗縣","南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
const changhua=["彰化市","鹿港鎮","和美鎮","北斗鎮","員林市","溪湖鎮","田中鎮","二林鎮","線西鄉","伸港鄉","福興鄉","秀水鄉","花壇鄉","芬園鄉","大村鄉","埔鹽鄉","埔心鄉","永靖鄉","社頭鄉","二水鄉","田尾鄉","埤頭鄉","芳苑鄉","大城鄉","竹塘鄉","溪州鄉"];
type Result={id:number;county:string;district:string;transaction_date:string;target_category:string;total_price_ntd:number|null;land_area_sqm:number|null;building_area_sqm:number|null;address_display?:string|null};
const targetOptions=[{id:"house_land",name:"房地"},{id:"land",name:"土地"},{id:"building",name:"建物"},{id:"parking",name:"車位"}];
const inputStyle:CSSProperties={width:"100%",minHeight:42,border:"1px solid #cbd5e1",borderRadius:8,padding:"8px 10px",background:"white",color:"#17243b"};
const gridStyle:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12};
export function RealPriceSearch(){
 const [county,setCounty]=useState("彰化縣"),[district,setDistrict]=useState("");
 const [dataset,setDataset]=useState("sale"),[targets,setTargets]=useState<string[]>(["house_land","land"]);
 const [road,setRoad]=useState(""),[section,setSection]=useState(""),[period,setPeriod]=useState("3");
 const [priceMin,setPriceMin]=useState(""),[priceMax,setPriceMax]=useState("");
 const [areaMin,setAreaMin]=useState(""),[areaMax,setAreaMax]=useState(""),[ageMax,setAgeMax]=useState("");
 const [advanced,setAdvanced]=useState(false),[page,setPage]=useState(1);
 const [queryString,setQueryString]=useState(""),[rows,setRows]=useState<Result[]>([]),[total,setTotal]=useState(0);
 const [status,setStatus]=useState<"idle"|"loading"|"ok"|"empty"|"unavailable"|"error">("idle"),[message,setMessage]=useState("");
 async function load(query:string,nextPage:number){
  setStatus("loading");setMessage("");
  const p=new URLSearchParams(query);p.set("page",String(nextPage));
  try{
    const response=await fetch("/api/public/real-price?"+p.toString(),{cache:"no-store"});
    const payload=await response.json() as {data?:Result[];total?:number;message?:string;error?:string};
    if(response.status===503 && payload.error==="not_ready"){setRows([]);setTotal(0);setStatus("unavailable");return;}
    if(!response.ok)throw new Error(payload.message||"查詢暫時無法使用");
    const list=Array.isArray(payload.data)?payload.data:[];
    setRows(list);setTotal(payload.total??0);setStatus(list.length?"ok":"empty");
  }catch(e){setRows([]);setTotal(0);setMessage(e instanceof Error?e.message:"查詢服務暫時無法使用");setStatus("error");}
 }
 function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault(); const p=new URLSearchParams({county,dataset});
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
  <p style={{color:"#64748b",margin:"8px 0 22px"}}>預設彰化縣，可切換全國縣市｜買賣・預售屋・租賃</p>
  <form onSubmit={submit} autoComplete="off" style={{padding:20,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,display:"grid",gap:17}}>
   <div style={gridStyle}>
    {f("資料類型",<select style={inputStyle} value={dataset} onChange={e=>setDataset(e.target.value)}><option value="sale">不動產買賣</option><option value="presale">預售屋</option><option value="rental">租賃</option></select>)}
    {f("縣市",<select style={inputStyle} value={county} onChange={e=>{setCounty(e.target.value);setDistrict("");}}>{counties.map(c=><option key={c}>{c}</option>)}</select>)}
    {f("鄉鎮市區",<select key={county} style={inputStyle} value={district} onChange={e=>setDistrict(e.target.value)}><option value="">全部鄉鎮市區</option>{(county==="彰化縣"?changhua:[]).map(d=><option key={d}>{d}</option>)}</select>)}
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
   {status==="empty"&&<p>在目前已公布的資料範圍內，沒有符合條件的紀錄。</p>}
   {status==="ok"&&<><p>符合條件：{total.toLocaleString("zh-TW")} 筆</p><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:670}}><thead><tr>{["交易日期","行政區","標的","地址","總價（萬元）","土地／建物坪數"].map(h=><th key={h} style={{textAlign:"left",padding:10,borderBottom:"1px solid #cbd5e1"}}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td style={{padding:10}}>{r.transaction_date}</td><td>{r.district}</td><td>{r.target_category}</td><td>{r.address_display||"未提供"}</td><td>{r.total_price_ntd==null?"—":(r.total_price_ntd/10000).toLocaleString("zh-TW")}</td><td>{[r.land_area_sqm,r.building_area_sqm].map(a=>a==null?"—":(a/3.305785).toFixed(2)).join("／")}</td></tr>)}</tbody></table></div><div style={{display:"flex",gap:12,alignItems:"center",marginTop:18}}><button disabled={page<=1} onClick={()=>changePage(page-1)}>上一頁</button><span>第 {page} 頁</span><button disabled={page*20>=total} onClick={()=>changePage(page+1)}>下一頁</button></div></>}
  </section>
 </main>;
}
