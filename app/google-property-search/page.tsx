"use client";

import { useMemo, useState } from "react";

const counties = ["不限縣市","臺北市","新北市","基隆市","桃園市","新竹市","新竹縣","苗栗縣","臺中市","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","臺南市","高雄市","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
const districts: Record<string,string[]> = {
  "彰化縣":["彰化市","鹿港鎮","和美鎮","北斗鎮","員林市","溪湖鎮","田中鎮","二林鎮","線西鄉","伸港鄉","福興鄉","秀水鄉","花壇鄉","芬園鄉","大村鄉","埔鹽鄉","埔心鄉","永靖鄉","社頭鄉","二水鄉","田尾鄉","埤頭鄉","芳苑鄉","大城鄉","竹塘鄉","溪州鄉"],
  "臺中市":["中區","東區","南區","西區","北區","北屯區","西屯區","南屯區","太平區","大里區","霧峰區","烏日區","豐原區","后里區","石岡區","東勢區","和平區","新社區","潭子區","大雅區","神岡區","大肚區","沙鹿區","龍井區","梧棲區","清水區","大甲區","外埔區","大安區"],
};
const portals = [
  {name:"太平洋房屋",domain:"pacific.com.tw"},
  {name:"591",domain:"591.com.tw"},
  {name:"樂屋網",domain:"rakuya.com.tw"},
  {name:"好房網",domain:"housefun.com.tw"},
];
const fieldStyle: React.CSSProperties = {display:"block",width:"100%",padding:"11px",border:"1px solid #b7b7b7",borderRadius:8,marginTop:4,background:"transparent",color:"inherit"};
const fieldLabel: React.CSSProperties = {display:"block",fontWeight:500};
const queryUrl=(q:string)=>"https://www.google.com/search?"+new URLSearchParams({q,hl:"zh-TW"}).toString();
const nonneg=(x:string)=>x!==""&&Number.isFinite(Number(x))&&Number(x)>=0;
function rangePhrase(min:string,max:string,unit:string){
  if(!nonneg(min)&&!nonneg(max))return "";
  if(nonneg(min)&&nonneg(max))return min+"至"+max+unit;
  return nonneg(min)?min+unit+"以上":max+unit+"以下";
}
export default function GooglePropertySearchPage(){
 const [county,setCounty]=useState("彰化縣"),[district,setDistrict]=useState(""),[otherDistrict,setOtherDistrict]=useState("");
 const [kind,setKind]=useState("住宅"),[minPrice,setMinPrice]=useState(""),[maxPrice,setMaxPrice]=useState("");
 const [minArea,setMinArea]=useState(""),[maxArea,setMaxArea]=useState(""),[areaType,setAreaType]=useState("建坪");
 const [age,setAge]=useState(""),[rooms,setRooms]=useState(""),[parking,setParking]=useState(false),[keyword,setKeyword]=useState("");
 const [includePresale,setIncludePresale]=useState(false);
 const towns=districts[county];
 const terms=useMemo(()=>{
   const list=[county==="不限縣市"?"":county,towns?district:otherDistrict,"出售",kind,
     rooms?rooms+"房":"",parking?"車位":"",rangePhrase(minPrice,maxPrice,"萬"),rangePhrase(minArea,maxArea,"坪"),minArea||maxArea?areaType:"",
     age?age==="30+"?"屋齡30年以上":"屋齡"+age+"年以下":"",keyword.trim()];
   if(!includePresale)list.push("-預售屋");
   return list.filter(Boolean).join(" ");
 },[county,towns,district,otherDistrict,kind,minPrice,maxPrice,minArea,maxArea,areaType,age,rooms,parking,keyword,includePresale]);
 const error=(nonneg(minPrice)&&nonneg(maxPrice)&&Number(minPrice)>Number(maxPrice))||(nonneg(minArea)&&nonneg(maxArea)&&Number(minArea)>Number(maxArea));
 const google=(domain?:string)=>queryUrl(terms+(domain?" site:"+domain:" ("+portals.map(p=>"site:"+p.domain).join(" OR ")+")"));
 return <main style={{maxWidth:890,margin:"0 auto",padding:"32px 18px 72px",lineHeight:1.65}}>
  <p style={{color:"#666",marginBottom:8}}>good.m2.cc · 跨平台搜尋 Preview v2</p>
  <h1 style={{fontSize:"clamp(24px,5vw,34px)",fontWeight:700,marginBottom:12}}>Google 售屋搜尋</h1>
  <p>依條件組合 Google 搜尋，不抓取或儲存其他網站的物件資料；點擊後在 Google 查看原網站搜尋結果。</p>
  <form style={{display:"grid",gap:15,border:"1px solid #ddd",borderRadius:12,padding:20,marginTop:20}} onSubmit={e=>{e.preventDefault();if(!error)window.open(google(),"_blank","noopener,noreferrer")}}>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
    <label style={fieldLabel}>縣市<select style={fieldStyle} value={county} onChange={e=>{setCounty(e.target.value);setDistrict("");setOtherDistrict("")}}>{counties.map(x=><option key={x}>{x}</option>)}</select></label>
    {towns?<label style={fieldLabel}>鄉鎮市區<select style={fieldStyle} value={district} onChange={e=>setDistrict(e.target.value)}><option value="">全區</option>{towns.map(x=><option key={x}>{x}</option>)}</select></label>:<label style={fieldLabel}>鄉鎮市區（選填）<input style={fieldStyle} value={otherDistrict} onChange={e=>setOtherDistrict(e.target.value)} placeholder="輸入行政區"/></label>}
   </div>
   <label style={fieldLabel}>物件類型<select style={fieldStyle} value={kind} onChange={e=>setKind(e.target.value)}>{["住宅","透天","華廈","電梯大樓","公寓","套房","店面","土地","農地","廠房","農舍"].map(x=><option key={x}>{x}</option>)}</select></label>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:12}}>
    <label style={fieldLabel}>最低總價（萬）<input style={fieldStyle} type="number" min="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)}/></label>
    <label style={fieldLabel}>最高總價（萬）<input style={fieldStyle} type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}/></label>
    <label style={fieldLabel}>房數<select style={fieldStyle} value={rooms} onChange={e=>setRooms(e.target.value)}><option value="">不限</option>{["1","2","3","4","5","6"].map(x=><option key={x} value={x}>{x}房</option>)}</select></label>
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:12}}>
    <label style={fieldLabel}>坪數種類<select style={fieldStyle} value={areaType} onChange={e=>setAreaType(e.target.value)}><option>建坪</option><option>地坪</option></select></label>
    <label style={fieldLabel}>最低坪數<input style={fieldStyle} type="number" min="0" value={minArea} onChange={e=>setMinArea(e.target.value)}/></label>
    <label style={fieldLabel}>最高坪數<input style={fieldStyle} type="number" min="0" value={maxArea} onChange={e=>setMaxArea(e.target.value)}/></label>
    <label style={fieldLabel}>屋齡<select style={fieldStyle} value={age} onChange={e=>setAge(e.target.value)}><option value="">不限</option>{["5","10","20","30"].map(x=><option key={x} value={x}>{x}年以下</option>)}<option value="30+">30年以上</option></select></label>
   </div>
   <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
    <label><input type="checkbox" checked={parking} onChange={e=>setParking(e.target.checked)}/> 需要車位</label>
    <label><input type="checkbox" checked={includePresale} onChange={e=>setIncludePresale(e.target.checked)}/> 包含預售屋</label>
   </div>
   <label style={fieldLabel}>其他關鍵字<input style={fieldStyle} value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="路名、社區、特色等"/></label>
   {error&&<p role="alert" style={{color:"#b3261e"}}>最低值不可大於最高值，請調整範圍。</p>}
   <button type="submit" disabled={error} style={{background:"#a52727",color:"#fff",fontWeight:700,border:0,borderRadius:8,padding:13,opacity:error?.5:1,cursor:"pointer"}}>開啟 Google 搜尋（四個網站）</button>
  </form>
  <h2 style={{fontSize:22,fontWeight:700,margin:"26px 0 12px"}}>依來源網站搜尋</h2>
  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{portals.map(p=><a key={p.name} href={error?undefined:google(p.domain)} onClick={e=>{if(error)e.preventDefault()}} target="_blank" rel="noopener noreferrer" style={{border:"1px solid #ccc",borderRadius:8,padding:"10px 14px",textDecoration:"none"}}>{p.name} ↗</a>)}</div>
  <p style={{fontSize:14,color:"#555",marginTop:22}}>這是 Google 關鍵字搜尋，不是即時物件資料庫。價格、坪數、房型、屋齡與車位都不保證精確符合；Google 索引可能延遲、缺漏或含已下架、預售、非物件頁。請以原站刊登資訊為準。本頁不讀取、不儲存外站物件資訊。</p>
 </main>;
}
