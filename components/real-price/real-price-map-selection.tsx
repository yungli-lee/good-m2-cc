"use client";
import {useEffect,useMemo,useRef,useState,type FormEvent,type PointerEvent} from "react";

type Pos={x:number;y:number};
type Property={id:string;title:string;listing_no?:string|null;city?:string|null;district?:string|null;address_public?:string|null;property_type?:string|null};
type GeoMatch={lat:string;lon:string;display_name:string;type?:string;addresstype?:string};
type Bounds={south:number;west:number;north:number;east:number};
// address_public may already contain the county and township. Avoid duplicating them.
export function buildPublicPropertyAddress(p:Pick<Property,"city"|"district"|"address_public">){
 const raw=(p.address_public||"").trim();
 const city=(p.city||"").trim();
 const district=(p.district||"").trim();
 let result=raw;
 // Property address can contain separated/fully qualified administrative labels.
 const canonical=(v:string)=>v.replace(/臺/g,"台").replace(/\s+/g,"");
 const hasPrefix=(v:string,prefix:string)=>canonical(v).startsWith(canonical(prefix));
 if(district&&!hasPrefix(result,district)&&!(city&&hasPrefix(result,city)&&canonical(result).slice(canonical(city).length).startsWith(canonical(district)))){
  result=district+(result?" "+result:"");
 }
 if(city&&!hasPrefix(result,city))result=city+(result?" "+result:"");
 return result.trim();
}
const WIDTH=800,HEIGHT=500, TILE=256;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const project=(lat:number,lon:number,z:number)=>{
 const scale=TILE*2**z;
 const sin=Math.sin(lat*Math.PI/180);
 return {x:(lon+180)/360*scale,y:(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale};
};
const unproject=(x:number,y:number,z:number)=>{
 const scale=TILE*2**z;
 return {lon:x/scale*360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*y/scale)))*180/Math.PI};
};
const initial={lat:24.075,lon:120.52,z:12};
export default function RealPriceMapSelection(){
 const [view,setView]=useState(initial);
 const mapRef=useRef<HTMLDivElement|null>(null);
 const [mapWidth,setMapWidth]=useState(WIDTH);
 useEffect(()=>{
  const el=mapRef.current;
  if(!el)return;
  const observer=new ResizeObserver(entries=>{
   const width=entries[0]?.contentRect.width;
   if(width&&Number.isFinite(width))setMapWidth(width);
  });
  observer.observe(el);
  return ()=>observer.disconnect();
 },[]);
 const [start,setStart]=useState<Pos|null>(null);
 const [current,setCurrent]=useState<Pos|null>(null);
 const [selected,setSelected]=useState<Bounds|null>(null);
 const [rect,setRect]=useState<{left:number;top:number;width:number;height:number}|null>(null);
 const [lookupMode,setLookupMode]=useState<"address"|"parcel">("address");
 const [address,setAddress]=useState(""),[parcelDistrict,setParcelDistrict]=useState(""),[parcelSection,setParcelSection]=useState(""),[parcelNo,setParcelNo]=useState("");
 const [properties,setProperties]=useState<Property[]>([]),[selectedProperty,setSelectedProperty]=useState(""),[propertyError,setPropertyError]=useState("");
 const [loading,setLoading]=useState(false),[locationError,setLocationError]=useState(""),[suggestedStreet,setSuggestedStreet]=useState(""),[located,setLocated]=useState<{lat:number;lon:number;description:string}|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/admin/real-price-map-properties",{signal:controller.signal,cache:"no-store",credentials:"same-origin"})
   .then(r=>{
    if(r.status===401||r.status===403)throw new Error("需要登入此 Preview 網域的後台，才能載入物件清單。正式站與 Preview 的登入狀態可能不共用。");
    if(!r.ok)throw new Error("物件清單暫時無法載入（HTTP "+r.status+"）。請重新整理或稍後再試。");
    return r.json() as Promise<{data:Property[]}>;
   })
   .then(p=>{setProperties(p.data||[]);setPropertyError("");})
   .catch(e=>{if(!controller.signal.aborted)setPropertyError(e instanceof Error?e.message:"物件清單載入失敗");});
  return ()=>controller.abort();
 },[]);
 function chooseProperty(id:string){
  setSelectedProperty(id);setLocated(null);setLocationError("");
  const p=properties.find(x=>x.id===id);
  if(!p)return;
  const addr=buildPublicPropertyAddress(p);
  setAddress(addr);setLookupMode("address");
  if(!p.address_public?.trim())setLocationError("此物件未填公開地址，請手動輸入可定位地址。系統不會自動讀取或外送屋主私人地址。");
 }
 async function locateAddress(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setLocationError("");setSuggestedStreet("");setLocated(null);
  if(lookupMode==="parcel"){
   if(!parcelDistrict.trim()||!parcelSection.trim()||!parcelNo.trim()){setLocationError("請完整輸入鄉鎮、地段及地號。");return;}
   setLocationError("已記錄地籍查詢條件，但尚未接上政府地籍座標服務，不能將地號當街道地址定位。可先輸入鄰近地址或手動移動地圖圈選。");
   return;
  }
  const q=address.trim();if(q.length<4){setLocationError("請輸入較完整的地址（至少4個字）。");return;}
  setLoading(true);
  try{
   // Search exactly what the user entered first. Never silently substitute a
   // road centroid for a precise house number without explicitly warning.
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   let matches:GeoMatch[];
   try{
    const params=new URLSearchParams({q:q.includes("台灣")||q.includes("臺灣")?q:"台灣 "+q,format:"json",limit:"5",countrycodes:"tw",addressdetails:"1"});
    const response=await fetch("https://nominatim.openstreetmap.org/search?"+params.toString(),{signal:controller.signal});
    if(!response.ok)throw new Error("定位服務目前無法使用（HTTP "+response.status+"）");
    matches=await response.json() as GeoMatch[];
   }finally{clearTimeout(timer);}
   const m=matches.find(x=>Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon)));
   if(!m){
    const street=q.replace(/[0-9０-９]+(?:之[0-9０-９]+)?(?:號|号).*$/,"").trim();
    if(street!==q&&street.length>=4){
     setLocationError("查不到精確門牌。可改用路段參考定位：「"+street+"」。路段座標不等於門牌位置，請核對後再圈選。");
     setSuggestedStreet(street);
    }else{
     setLocationError("查無可定位地址。請補上縣市、鄉鎮及路名，或用地圖手動圈選。");
     setSuggestedStreet("");
    }
    return;
   }
   setSuggestedStreet("");
   const lat=Number(m.lat),lon=Number(m.lon);
   setView({lat,lon,z:16});setSelected(null);setRect(null);setLocated({lat,lon,description:m.display_name});
  }catch(e){setLocationError("地址定位失敗："+(e instanceof Error?e.message:"網路錯誤")+"。仍可手動圈選。");}
  finally{setLoading(false);}
 }
 const world=project(view.lat,view.lon,view.z);
 const tiles=useMemo(()=>{
  const result:{x:number;y:number;left:number;top:number;key:string}[]=[];
  const size=2**view.z;
  const left=world.x-WIDTH/2,top=world.y-HEIGHT/2;
  for(let tx=Math.floor(left/TILE);tx<=Math.floor((left+WIDTH)/TILE);tx++){
   for(let ty=Math.floor(top/TILE);ty<=Math.floor((top+HEIGHT)/TILE);ty++){
    if(ty<0||ty>=size)continue;
    result.push({x:((tx%size)+size)%size,y:ty,left:tx*TILE-left,top:ty*TILE-top,key:tx+":"+ty});
   }
  }
  return result;
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[view]);
 const point=(e:PointerEvent<HTMLDivElement>):Pos=>{
  const bounds=e.currentTarget.getBoundingClientRect();
  return {x:clamp((e.clientX-bounds.left)*WIDTH/bounds.width,0,WIDTH),y:clamp((e.clientY-bounds.top)*HEIGHT/bounds.height,0,HEIGHT)};
 };
 const draw=(a:Pos,b:Pos)=>({left:Math.min(a.x,b.x),top:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)});
 const move=(dx:number,dy:number)=>{
  const p=unproject(world.x+dx,world.y+dy,view.z);
  setView(v=>({...v,lat:clamp(p.lat,-85,85),lon:p.lon}));
  setSelected(null);setRect(null);
 };
 const finish=(e:PointerEvent<HTMLDivElement>)=>{
  if(!start)return;
  const end=point(e),box=draw(start,end);
  setStart(null);setCurrent(null);
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  if(box.width<8||box.height<8)return;
  const a=unproject(world.x-WIDTH/2+box.left,world.y-HEIGHT/2+box.top,view.z);
  const b=unproject(world.x-WIDTH/2+box.left+box.width,world.y-HEIGHT/2+box.top+box.height,view.z);
  setRect(box);
  setSelected({north:a.lat,west:a.lon,south:b.lat,east:b.lon});
 };
 const clearSelection=()=>{setStart(null);setCurrent(null);setSelected(null);setRect(null);};
 const live=start&&current?draw(start,current):rect;
 return <main style={{maxWidth:1000,margin:"24px auto",padding:"16px",color:"#17243b"}}>
  <h1 style={{fontSize:28,fontWeight:700}}>地圖式成交行情｜圈選測試版</h1>
  <p>在地圖上拖曳畫出矩形範圍；可用下方方向鍵移動、放大縮小。此版本僅提供範圍選取，<strong>尚未連接交易座標比對、範圍內搜尋或 A4 報告</strong>，請勿把圈選當成已完成的成交查詢。</p>
  <section style={{padding:16,background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:10,marginTop:16}}>
   <h2 style={{fontSize:18,fontWeight:700,marginBottom:10}}>先找標的，再圈選周邊</h2>
   <label style={{display:"block",marginBottom:12}}>從後台選擇物件（需登入；僅使用公開地址）
    <select style={{display:"block",width:"100%",minHeight:42,padding:8,marginTop:5,border:"1px solid #94a3b8",borderRadius:6}} value={selectedProperty} onChange={e=>chooseProperty(e.target.value)}>
     <option value="">不選物件，手動輸入</option>
     {properties.map(p=><option key={p.id} value={p.id}>{p.title}{p.listing_no?"｜"+p.listing_no:""}｜{p.district||""}</option>)}
    </select>
   </label>
   {propertyError&&<p role="status" style={{color:"#92400e"}}>{propertyError} <a href="/admin/login" style={{textDecoration:"underline",fontWeight:700}}>登入 Preview 後台（登入後再返回地圖頁）</a></p>}
   <form onSubmit={locateAddress}>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:8}}>
     <label><input type="radio" checked={lookupMode==="address"} onChange={()=>setLookupMode("address")}/> 地址</label>
     <label><input type="radio" checked={lookupMode==="parcel"} onChange={()=>setLookupMode("parcel")}/> 地段地號</label>
    </div>
    {lookupMode==="address"?<label style={{display:"block"}}>地址（定位服務由 OpenStreetMap Nominatim 提供）
     <input value={address} maxLength={180} onChange={e=>{setAddress(e.target.value);setSelectedProperty("");}} placeholder="例如：彰化縣鹿港鎮中山路..." style={{display:"block",width:"100%",minHeight:42,border:"1px solid #94a3b8",borderRadius:6,padding:8,marginTop:5}}/>
    </label>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
     <label>鄉鎮市區<input value={parcelDistrict} onChange={e=>setParcelDistrict(e.target.value)} placeholder="福興鄉" style={{width:"100%",padding:8,border:"1px solid #94a3b8"}}/></label>
     <label>地段<input value={parcelSection} onChange={e=>setParcelSection(e.target.value)} placeholder="新生段" style={{width:"100%",padding:8,border:"1px solid #94a3b8"}}/></label>
     <label>地號<input value={parcelNo} onChange={e=>setParcelNo(e.target.value)} placeholder="2106" style={{width:"100%",padding:8,border:"1px solid #94a3b8"}}/></label>
    </div>}
    <button type="submit" disabled={loading} style={{marginTop:12,background:"#173b55",color:"white",padding:"10px 18px",borderRadius:6}}>{loading?"定位中…":lookupMode==="address"?"定位到地圖":"確認地號輸入"}</button>
   </form>
   {locationError&&<p role="status" style={{color:"#9a3412",marginTop:10}}>{locationError}</p>}
   {suggestedStreet&&<button type="button" onClick={()=>{setAddress(suggestedStreet);setSuggestedStreet("");setLocationError("已換成路段地址，請按「定位到地圖」。");}} style={{marginTop:8,padding:"8px 12px",border:"1px solid #173b55",borderRadius:6}}>改用路段定位：{suggestedStreet}</button>}
   {located&&<p role="status" style={{marginTop:10}}>定位參考位置：{located.description}。此為第三方地理編碼結果，請核對門牌位置後再圈選，非官方地籍鑑界。</p>}
   <p style={{fontSize:12,color:"#64748b",marginTop:10}}>只有按「定位到地圖」後才將輸入地址送往第三方服務；請勿輸入不希望傳送的私人地址。地號模式目前不外傳資料，也不會假造定位結果。</p>
  </section>
  <div ref={mapRef} style={{position:"relative",maxWidth:WIDTH,margin:"14px auto",aspectRatio:"8 / 5",overflow:"hidden",background:"#e2e8f0",touchAction:"none",border:"1px solid #94a3b8",borderRadius:8,cursor:"crosshair"}}
   aria-label="拖曳圈選地圖範圍"
   onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);setStart(point(e));setCurrent(point(e));setSelected(null);setRect(null);}}
   onPointerMove={e=>{if(start)setCurrent(point(e));}}
   onPointerUp={finish} onPointerCancel={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);setStart(null);setCurrent(null);}}>
   <div style={{position:"absolute",inset:0,width:WIDTH,height:HEIGHT,transformOrigin:"top left",transform:`scale(${mapWidth/WIDTH})`,pointerEvents:"none"}}>
    {tiles.map(tile=><img key={tile.key} src={`https://tile.openstreetmap.org/${view.z}/${tile.x}/${tile.y}.png`} alt="" draggable={false} width={TILE} height={TILE} style={{position:"absolute",left:tile.left,top:tile.top,maxWidth:"none"}}/>)}
    {located&&<div aria-label="標的定位參考點" style={{position:"absolute",left:project(located.lat,located.lon,view.z).x-world.x+WIDTH/2-10,top:project(located.lat,located.lon,view.z).y-world.y+HEIGHT/2-10,width:20,height:20,borderRadius:"50%",border:"3px solid white",background:"#dc2626",boxShadow:"0 0 0 2px #991b1b"}}/>}
    {live&&<div style={{position:"absolute",left:live.left,top:live.top,width:live.width,height:live.height,border:"2px solid #1d4ed8",background:"rgba(37,99,235,.18)",boxSizing:"border-box"}}/>}
   </div>
   <span style={{position:"absolute",bottom:6,right:8,fontSize:11,background:"#fffd",padding:"2px 5px",pointerEvents:"none"}}>© OpenStreetMap contributors</span>
  </div>
  <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap",marginTop:12}}>
   <button type="button" onClick={clearSelection} disabled={!selected&&!start} aria-label="清除目前圈選範圍並重新圈選">重新圈選</button>
   <button type="button" onClick={()=>move(0,-150)}>↑ 北移</button>
   <button type="button" onClick={()=>move(-150,0)}>← 西移</button>
   <button type="button" onClick={()=>move(150,0)}>東移 →</button>
   <button type="button" onClick={()=>move(0,150)}>南移 ↓</button>
   <button type="button" onClick={()=>{setView(v=>({...v,z:Math.min(v.z+1,17)}));setSelected(null);setRect(null);}}>＋ 放大</button>
   <button type="button" onClick={()=>{setView(v=>({...v,z:Math.max(v.z-1,8)}));setSelected(null);setRect(null);}}>－ 縮小</button>
  </div>
  {selected?<section style={{background:"#eff6ff",padding:12,marginTop:16,borderRadius:8}}>
    <strong>已圈選經緯度範圍</strong>
    <p style={{overflowWrap:"anywhere"}}>北緯 {selected.north.toFixed(6)} ～ {selected.south.toFixed(6)}；東經 {selected.west.toFixed(6)} ～ {selected.east.toFixed(6)}</p>
    <p>下一階段須建立官方交易地址／地號的可信定位資料，才能以此範圍精確查詢；不能拿行政區或路名假裝符合圈選。</p>
   </section>:<p style={{textAlign:"center"}}>尚未圈選範圍</p>}
  <p style={{marginTop:20}}>既有功能：<a href="/real-price" style={{textDecoration:"underline"}}>條件式實價查詢</a>。後台另有獨立 A4 報告製作功能。</p>
 </main>;
}
