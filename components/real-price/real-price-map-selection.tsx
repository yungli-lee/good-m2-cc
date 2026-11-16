"use client";
import {useMemo,useState,type PointerEvent} from "react";

type Pos={x:number;y:number};
type Bounds={south:number;west:number;north:number;east:number};
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
 const [start,setStart]=useState<Pos|null>(null);
 const [current,setCurrent]=useState<Pos|null>(null);
 const [selected,setSelected]=useState<Bounds|null>(null);
 const [rect,setRect]=useState<{left:number;top:number;width:number;height:number}|null>(null);
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
  if(box.width<8||box.height<8)return;
  const a=unproject(world.x-WIDTH/2+box.left,world.y-HEIGHT/2+box.top,view.z);
  const b=unproject(world.x-WIDTH/2+box.left+box.width,world.y-HEIGHT/2+box.top+box.height,view.z);
  setRect(box);
  setSelected({north:a.lat,west:a.lon,south:b.lat,east:b.lon});
  e.currentTarget.releasePointerCapture(e.pointerId);
 };
 const live=start&&current?draw(start,current):rect;
 return <main style={{maxWidth:1000,margin:"24px auto",padding:"16px",color:"#17243b"}}>
  <h1 style={{fontSize:28,fontWeight:700}}>地圖式成交行情｜圈選測試版</h1>
  <p>在地圖上拖曳畫出矩形範圍；可用下方方向鍵移動、放大縮小。此版本僅提供範圍選取，<strong>尚未連接交易座標比對、範圍內搜尋或 A4 報告</strong>，請勿把圈選當成已完成的成交查詢。</p>
  <div style={{position:"relative",maxWidth:WIDTH,margin:"14px auto",aspectRatio:"8 / 5",overflow:"hidden",background:"#e2e8f0",touchAction:"none",border:"1px solid #94a3b8",borderRadius:8,cursor:"crosshair"}}
   aria-label="拖曳圈選地圖範圍"
   onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);setStart(point(e));setCurrent(point(e));setSelected(null);setRect(null);}}
   onPointerMove={e=>{if(start)setCurrent(point(e));}}
   onPointerUp={finish} onPointerCancel={()=>{setStart(null);setCurrent(null);}}>
   <div style={{position:"absolute",inset:0,width:WIDTH,height:HEIGHT,transformOrigin:"top left",transform:"scale(1)",pointerEvents:"none"}}>
    {tiles.map(tile=><img key={tile.key} src={`https://tile.openstreetmap.org/${view.z}/${tile.x}/${tile.y}.png`} alt="" draggable={false} width={TILE} height={TILE} style={{position:"absolute",left:tile.left,top:tile.top,maxWidth:"none"}}/>)}
    {live&&<div style={{position:"absolute",left:live.left,top:live.top,width:live.width,height:live.height,border:"2px solid #1d4ed8",background:"rgba(37,99,235,.18)",boxSizing:"border-box"}}/>}
   </div>
   <span style={{position:"absolute",bottom:6,right:8,fontSize:11,background:"#fffd",padding:"2px 5px",pointerEvents:"none"}}>© OpenStreetMap contributors</span>
  </div>
  <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap",marginTop:12}}>
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
