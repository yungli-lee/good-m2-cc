/**
 * Runtime integration check for the official XLS reader.
 * Builds a minimal BIFF8/CFB fixture with MOI's four authentic sheet schemas
 * without storing a user's actual transaction export in the public repo.
 * node --experimental-strip-types scripts/test-official-xls-import.mjs
 */
import assert from "node:assert/strict";
import { importOfficialXls } from "../lib/real-price/official-xls-import.ts";
const u16=(x)=>{const b=Buffer.alloc(2);b.writeUInt16LE(x);return b};
const u32=(x)=>{const b=Buffer.alloc(4);b.writeUInt32LE(x>>>0);return b};
const rec=(kind,payload=Buffer.alloc(0))=>Buffer.concat([u16(kind),u16(payload.length),payload]);
const bof=rec(0x809,Buffer.from("00061000f215cc070000000006000000","hex"));
const eof=rec(0x0a);
const cases=[
  ["買賣案件:房地(土地+建物),115 年 5 月 至115 年 10 月","資料來源：不動產交易實價查詢服務網　2026年11月08日 12:11:38"],
  ["編號","地段位置或門牌","社區簡稱","交易日期","總價(萬元)","單價(萬元/坪)","總面積(坪)","主建物佔比","型態","屋齡","樓別/樓高","主要用途","交易標的","交易筆棟數","建物現況格局","車位總價(萬元)","管理組織","電梯","備註"],
  ["1","鹿港鎮民權路４４巷６號","","115/08/09","80","","11.95","","透天厝","42","全/二層","住家用","房地(土地+建物)","土:1 建物:1 車位:0","2房1廳2衛","","無","無","親友、員工、共有人或其他特殊關係間之交易;"],
  ["2","鹿港鎮安順街８８號","","115/07/07","1,050","","52.54","","透天厝","33","全/四層","住家用","房地(土地+建物)","土:1 建物:1 車位:0","4房2廳3衛","","無","無",""]
];
// Exercise first-50 cap: add 50 further records, of which #51 and #52 must be hidden.
for(let n=3;n<=52;n++)cases.push([String(n),"鹿港鎮測試路"+n+"號","","115/08/01","500","","35.00","","透天厝","20","全/三層","住家用","房地(土地+建物)","土:1 建物:1 車位:0","3房2廳2衛","","無","無",""]);
const land=[
  ["序號","土地位置","土地移轉面積","使用分區或編定","備註"],
  ["1-1","埔崙段235地號","9.50坪","都市：住宅區",""],
  ["2-1","永安段3623-6地號","21.48坪","都市：住宅區",""]
];
const build=[
  ["序號","屋齡","建物移轉面積","持分","主要用途","主要建材","建築完成日期","總層數","建物分層"],
  ["1-1","42","11.95坪","持分移轉","住家用","加強磚造","073/05","二層","一層,二層"],
  ["2-1","33","52.54坪","全筆移轉","住家用","鋼筋混凝土造","082/04","四層","一層,二層,三層,四層"]
];
const parking=[["序號","車位類別","車位價格","車位面積","所在樓層"]];
const sheets=[["案件列表",cases],["土地",land],["建物",build],["車位",parking]];
const allStrings=[];const keys=new Map();
function sstIndex(s) {
  if(!keys.has(s)){keys.set(s,allStrings.length);allStrings.push(s);}
  return keys.get(s);
}
const sheetRecords=sheets.map(([,rows])=>{
  const cells=[];
  rows.forEach((row,r)=>row.forEach((value,col)=>{
    const b=Buffer.concat([u16(r),u16(col),u16(0),u32(sstIndex(value))]);
    cells.push(rec(0xfd,b));
  }));
  return Buffer.concat([bof,...cells,eof]);
});
const sst=rec(0xfc,Buffer.concat([
  u32([...sheets].reduce((sum,[,rows])=>sum+rows.reduce((x,row)=>x+row.length,0),0)),
  u32(allStrings.length),
  ...allStrings.map(s=>Buffer.concat([u16(s.length),Buffer.from([1]),Buffer.from(s,"utf16le")]))
]));
const boundaryRecords=sheets.map(([name])=>{
  const chars=Buffer.from(name,"utf16le");
  return rec(0x85,Buffer.concat([u32(0),Buffer.from([0,0,name.length,1]),chars]));
});
const filler=rec(0x0000,Buffer.alloc(5000));
const prelim=Buffer.concat([bof,...boundaryRecords,sst,filler,eof]);
let offset=prelim.length;
const patched=boundaryRecords.map((original,i)=>{
  const data=Buffer.from(original);data.writeUInt32LE(offset,4);
  offset+=sheetRecords[i].length;
  return data;
});
const book=Buffer.concat([bof,...patched,sst,filler,eof,...sheetRecords]);
assert.ok(book.length>=4096);
const sectorCount=Math.ceil(book.length/512);
assert.ok(sectorCount+2<128);
const header=Buffer.alloc(512,0);
Buffer.from("d0cf11e0a1b11ae1","hex").copy(header,0);
header.writeUInt16LE(0x003e,24);
header.writeUInt16LE(0x0003,26);
header.writeUInt16LE(0xfffe,28);
header.writeUInt16LE(9,30);
header.writeUInt16LE(6,32);
header.writeUInt32LE(1,44); // One FAT sector
header.writeUInt32LE(sectorCount,48); // Directory sector
header.writeUInt32LE(4096,56);
header.writeUInt32LE(0xfffffffe,60);
header.writeUInt32LE(0xfffffffe,68);
header.writeUInt32LE(sectorCount+1,76);
for(let i=1;i<109;i++)header.writeUInt32LE(0xffffffff,76+i*4);
const filebook=Buffer.alloc(sectorCount*512);
book.copy(filebook);
const dir=Buffer.alloc(512);
function entry(index,name,type,start,size){
  const p=index*128;Buffer.from(name+"\0","utf16le").copy(dir,p);
  dir.writeUInt16LE((name.length+1)*2,p+64);dir[p+66]=type;
  dir.writeUInt32LE(start>>>0,p+116);
  dir.writeBigUInt64LE(BigInt(size),p+120);
}
entry(0,"Root Entry",5,0xfffffffe,0);
entry(1,"Workbook",2,0,book.length);
const fat=Buffer.alloc(512,0xff);
for(let i=0;i<sectorCount;i++)fat.writeUInt32LE(i===sectorCount-1?0xfffffffe:i+1,i*4);
fat.writeUInt32LE(0xfffffffe,sectorCount*4);
fat.writeUInt32LE(0xfffffffd,(sectorCount+1)*4);
const fake=Buffer.concat([header,filebook,dir,fat]);
const file=new File([fake],"official-test.xls",{type:"application/vnd.ms-excel"});
const result=await importOfficialXls(file);
assert.deepEqual(result.sheets,["案件列表","土地","建物","車位"]);
assert.equal(result.officialType,"房地(土地+建物)");
assert.equal(result.officialPeriod,"115年5月至115年10月");
assert.match(result.exportedAt,/2026年11月08日\s*12:11:38/);
assert.equal(result.rows.length,20);
assert.equal(result.totalInSource,52);
assert.equal(result.shownSourceCount,20);
assert.equal(result.omitted,32);
assert.ok(result.rows[19].sourceId.endsWith(':20'));
assert.deepEqual(result.skippedIndexes,[]);
assert.ok(!result.rows.some(x=>Number(x.sourceId.split(':').at(-1))>20));
assert.equal(result.skipped,0);
assert.equal(result.rows[0].date,"2026-08-09");
assert.equal(result.rows[0].price,"80");
assert.equal(result.rows[0].floorCount,"二層");
assert.equal(result.rows[0].buildingAge,42);
assert.equal(result.rows[0].landPing,9.5);
assert.equal(result.rows[0].buildingPing,11.95);
assert.equal(result.rows[0].special,true);
assert.equal(result.rows[1].landPing,21.48);
assert.equal(result.rows[1].buildingPing,52.54);
assert.equal(result.rows[1].price,"1050");
assert.equal(result.rows[1].special,false);
console.log("PASS MOI official XLS BIFF8: four sheets, linked land/building, date, price, special-note classification");
