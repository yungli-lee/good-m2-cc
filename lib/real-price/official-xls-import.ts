/**
 * Client-side reader for official MOI real-price .xls exports (BIFF8 in CFB).
 * No upload to our servers or third parties. Fails closed on unsupported files.
 * Deliberately limited to official four-sheet export; no arbitrary Excel formulas
 * are executed, and untrusted cells are rendered as plain React text.
 */
export type ImportedOfficialRow = {
  sourceId:string; date:string; area:string; kind:string; price:string|null;
  landPing:number|null; buildingPing:number|null; floorCount:string|null;
  buildingAge:number|null; note:string; cancellation:string; special:boolean;
  ping:number|null; sourcePeriod:string|null; id:number;
  latitude:null;longitude:null;locationPrecision:"unlocated";
};
type Sheet = { name:string; cells:Map<string,string|number> };
const MAX_BYTES=8*1024*1024;
const u16=(d:DataView,i:number)=>d.getUint16(i,true);
const u32=(d:DataView,i:number)=>d.getUint32(i,true);
function check(condition:unknown,message:string):asserts condition {if(!condition)throw Error(message);}
function decodeChars(bytes:Uint8Array,unicode:boolean) {
  if(unicode){
    check(bytes.length%2===0,"Unicode欄位長度異常");
    return new TextDecoder("utf-16le").decode(bytes);
  }
  return Array.from(bytes,b=>String.fromCharCode(b)).join("");
}
function readCompoundWorkbook(bytes:Uint8Array):Uint8Array {
  const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  check(bytes.length>=512 && [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]
    .every((x,i)=>bytes[i]===x),"不是有效的舊版Excel .xls檔案");
  const size=2**u16(d,30);
  check((size===512||size===4096) && bytes.length>=size,"不支援的OLE磁區格式");
  const total=Math.floor((bytes.length-512)/size);
  const sector=(id:number)=>{
    check(id<total,"Excel磁區索引超出檔案範圍");
    return bytes.subarray(512+id*size,512+(id+1)*size);
  };
  const fatIds:number[]=[];
  for(let i=0;i<109;i++){
    const id=u32(d,76+i*4);if(id<0xfffffffa)fatIds.push(id);
  }
  const expected=u32(d,44);
  check(expected>0 && expected<=fatIds.length,"檔案使用不支援的延伸磁區配置");
  const fat=new Uint8Array(expected*size);
  fatIds.slice(0,expected).forEach((id,i)=>fat.set(sector(id),i*size));
  const fd=new DataView(fat.buffer);
  function chain(start:number,expectedLength?:number) {
    const result:Uint8Array[]=[];const seen=new Set<number>();let id=start;
    while(id<0xfffffffa){
      check(id<total && !seen.has(id) && seen.size<=total,"Excel磁區鏈異常");
      seen.add(id);result.push(sector(id));check((id+1)*4<=fat.length,"FAT索引異常");
      id=u32(fd,id*4);
      if(expectedLength!==undefined && result.length*size>=expectedLength)break;
    }
    const out=new Uint8Array(result.length*size);
    result.forEach((a,i)=>out.set(a,i*size));
    return expectedLength===undefined?out:out.slice(0,expectedLength);
  }
  const directory=chain(u32(d,48));
  let workbookStart=-1,workbookLength=0;
  for(let p=0;p+128<=directory.length;p+=128){
    const v=new DataView(directory.buffer,directory.byteOffset+p,128);
    const nameLength=u16(v,64);if(nameLength<2||nameLength>64)continue;
    const name=decodeChars(directory.subarray(p,p+nameLength-2),true);
    if((name==="Workbook"||name==="Book") && directory[p+66]===2){
      workbookStart=u32(v,116);workbookLength=u32(v,120);break;
    }
  }
  check(workbookStart>=0 && workbookLength>=4096 && workbookLength<=MAX_BYTES,
    "未找到可解析的BIFF8 Workbook（不支援小型OLE MiniStream）");
  return chain(workbookStart,workbookLength);
}
type RecordItem={at:number;kind:number;value:Uint8Array};
class Segments{
  i=0; p=0;
  constructor(public blocks:Uint8Array[]){}
  read(length:number){
    check(length>=0&&length<MAX_BYTES,"SST長度異常");
    const out=new Uint8Array(length);let written=0;
    while(written<length){
      while(this.i<this.blocks.length && this.p>=this.blocks[this.i].length){this.i++;this.p=0;}
      check(this.i<this.blocks.length,"共享字串表提前結束");
      const n=Math.min(length-written,this.blocks[this.i].length-this.p);
      out.set(this.blocks[this.i].subarray(this.p,this.p+n),written);
      this.p+=n;written+=n;
    }
    return out;
  }
  num16(){const b=this.read(2);return b[0]+b[1]*256;}
  num32(){const b=this.read(4);return (b[0]+b[1]*256+b[2]*65536+b[3]*16777216)>>>0;}
  chars(count:number,wide:boolean){
    let output="";
    for(let i=0;i<count;i++){
      if(this.p===this.blocks[this.i].length){
        this.i++;this.p=0;
        check(this.i<this.blocks.length,"跨區塊共享字串缺失");
        wide=Boolean(this.read(1)[0]&1); // BIFF CONTINUE option byte
      }
      const len=wide?2:1;
      check(this.p+len<=this.blocks[this.i].length,"跨區塊Unicode字元損毀");
      output+=decodeChars(this.blocks[this.i].subarray(this.p,this.p+len),wide);
      this.p+=len;
    }
    return output;
  }
}
function parseSST(records:RecordItem[]) {
  const index=records.findIndex(r=>r.kind===0xfc);
  check(index>=0,"Excel缺少共享字串表");
  const blocks=[records[index].value];
  for(let i=index+1;i<records.length && records[i].kind===0x3c;i++)blocks.push(records[i].value);
  const reader=new Segments(blocks);
  reader.num32();const unique=reader.num32();
  check(unique<=100000,"Excel共享字串過多");
  const strings:string[]=[];
  for(let i=0;i<unique;i++){
    const len=reader.num16(),opt=reader.read(1)[0];
    const rich=opt&8?reader.num16():0;
    const ext=opt&4?reader.num32():0;
    check(len<=32767 && rich<10000 && ext<MAX_BYTES,"Excel字串格式異常");
    strings.push(reader.chars(len,Boolean(opt&1)));
    reader.read(4*rich+ext);
  }
  return strings;
}
function rkNumber(rk:number){
  let n:number;
  if(rk&2) n=(rk>>2);
  else {const buf=new ArrayBuffer(8),v=new DataView(buf);v.setUint32(0,0,true);v.setUint32(4,rk&0xfffffffc,true);n=v.getFloat64(0,true);}
  return (rk&1)?n/100:n;
}
function parseBIFF(bytes:Uint8Array):Sheet[]{
  const raw=readCompoundWorkbook(bytes),data=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
  const records:RecordItem[]=[];
  for(let i=0;i+4<=raw.length;){
    const kind=u16(data,i),size=u16(data,i+2);
    check(i+4+size<=raw.length,"Excel工作表記錄長度異常");
    records.push({at:i,kind,value:raw.subarray(i+4,i+4+size)});
    i+=4+size;
  }
  const strings=parseSST(records);
  const positions:{at:number;name:string}[]=[];
  records.filter(r=>r.kind===0x85).forEach(r=>{
    const d=new DataView(r.value.buffer,r.value.byteOffset,r.value.byteLength);
    const n=r.value[6],wide=Boolean(r.value[7]&1);
    const len=n*(wide?2:1);
    check(8+len<=r.value.length,"工作表名稱損毀");
    positions.push({at:u32(d,0),name:decodeChars(r.value.subarray(8,8+len),wide)});
  });
  check(positions.length>=2&&positions.length<=32,"未找到官方Excel工作表");
  const sheets:Sheet[]=[];
  for(const location of positions){
    const start=records.findIndex(r=>r.at===location.at);
    check(start>=0,"工作表起始位置異常");
    const cells=new Map<string,string|number>();
    const put=(row:number,col:number,value:string|number)=>{
      check(row<=10000&&col<=512,"Excel超出可解析範圍");
      cells.set(row+":"+col,value);
    };
    for(let i=start;i<records.length;i++){
      const r=records[i];if(r.kind===0xa)break;
      const v=r.value,d=new DataView(v.buffer,v.byteOffset,v.byteLength);
      if(r.kind===0xfd && v.length>=10){
        const row=u16(d,0),col=u16(d,2),id=u32(d,6);
        check(id<strings.length,"Excel字串索引無效");put(row,col,strings[id]);
      } else if(r.kind===0x203&&v.length>=14){
        put(u16(d,0),u16(d,2),d.getFloat64(6,true));
      } else if(r.kind===0x27e && v.length>=10){
        put(u16(d,0),u16(d,2),rkNumber(u32(d,6)));
      } else if(r.kind===0xbd && v.length>=12){
        const row=u16(d,0),first=u16(d,2);
        const last=u16(d,v.length-2);
        for(let col=first;col<=last;col++){
          const pos=4+(col-first)*6;
          if(pos+6>v.length-2)break;
          put(row,col,rkNumber(u32(d,pos+2)));
        }
      }
    }
    sheets.push({name:location.name,cells});
  }
  return sheets;
}
function table(sheet:Sheet,headerRow:number){
  const headers:string[]=[];
  for(let i=0;i<45;i++)headers.push(String(sheet.cells.get(headerRow+":"+i)??"").trim());
  const rows:Record<string,string>[]=[];
  for(let row=headerRow+1;row<=10000;row++){
    const entry:Record<string,string>={};
    for(let col=0;col<headers.length;col++){
      if(headers[col])entry[headers[col]]=String(sheet.cells.get(row+":"+col)??"").trim();
    }
    if(!Object.values(entry).some(Boolean)){
      if(row>headerRow+2)break;
      continue;
    }
    rows.push(entry);
  }
  return rows;
}
const num=(raw:string)=>{const n=Number(raw.replace(/[,，\s]/g,""));return Number.isFinite(n)?n:null;};
const ping=(raw:string)=>num(raw.replace(/坪/g,""));
function rocDate(s:string){
  const m=/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/.exec(s.trim());
  if(!m)return null;
  const year=Number(m[1])+1911,month=Number(m[2]),day=Number(m[3]);
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return [year,String(month).padStart(2,"0"),String(day).padStart(2,"0")].join("-");
}
const suspicious=/親友|員工|共有人|特殊關係|協議價購|政府機關|標售|拍賣|地清|持分|未登記|增建|頂樓加蓋|分件登記|分次登記|解約/;
export type OfficialImport = { rows:ImportedOfficialRow[]; skipped:number; filename:string; notice:string; sheets:string[] };
export async function importOfficialXls(file:File):Promise<OfficialImport>{
  check(/\.xls$/i.test(file.name),"請上傳內政部匯出的 .xls 檔案");
  check(file.size>512&&file.size<=MAX_BYTES,"Excel檔案須小於8MB");
  const bytes=new Uint8Array(await file.arrayBuffer());
  const sheets=parseBIFF(bytes);
  const main=sheets.find(s=>s.name==="案件列表");
  check(main,"不是可辨識的內政部『案件列表』Excel");
  const header=(name:string)=>Array.from({length:25},(_,i)=>String(main.cells.get("1:"+i)??"")).includes(name);
  check(["編號","地段位置或門牌","交易日期","總價(萬元)","型態","備註"].every(header),
    "Excel表頭與內政部官方匯出格式不符");
  const lands=sheets.find(s=>s.name==="土地");
  const buildings=sheets.find(s=>s.name==="建物");
  const landRows=lands?table(lands,0):[];
  const buildingRows=buildings?table(buildings,0):[];
  const mainRows=table(main,1);
  check(mainRows.length<=1000,"單次最多匯入1000筆官方查詢結果");
  const sha=await crypto.subtle.digest("SHA-256",bytes);
  const digest=Array.from(new Uint8Array(sha).slice(0,10)).map(x=>x.toString(16).padStart(2,"0")).join("");
  const rows:ImportedOfficialRow[]=[];let skipped=0;
  for(let i=0;i<mainRows.length;i++){
    const r=mainRows[i],index=r["編號"];
    const date=rocDate(r["交易日期"]||"");
    const price=num(r["總價(萬元)"]||"");
    const address=r["地段位置或門牌"]||"";
    if(!index || !date || price===null || price<=0 || !address){skipped++;continue;}
    const subset=landRows.filter(a=>a["序號"]?.startsWith(index+"-"));
    const bset=buildingRows.filter(a=>a["序號"]?.startsWith(index+"-"));
    const landValues=subset.map(x=>ping(x["土地移轉面積"]||"")).filter((n):n is number=>n!==null);
    const buildingValues=bset.map(x=>ping(x["建物移轉面積"]||"")).filter((n):n is number=>n!==null);
    const land=landValues.length ? Math.round(landValues.reduce((a,b)=>a+b,0)*100)/100:null;
    const build=ping(r["總面積(坪)"]||"") ??
      (buildingValues.length?Math.round(buildingValues.reduce((a,b)=>a+b,0)*100)/100:null);
    const age=num(r["屋齡"]||"") ?? num(bset[0]?.["屋齡"]||"");
    const floorField=r["樓別/樓高"]||"";
    const floor=floorField.includes("/")?floorField.split("/").at(-1)?.trim():bset[0]?.["總層數"];
    const note=r["備註"]||"";
    const kind=r["型態"]||r["交易標的"]||"";
    rows.push({
      id:i+1,sourceId:"official-upload:"+digest+":"+index,
      date,area:address,kind,price:String(price),
      landPing:land,buildingPing:build,floorCount:floor||null,buildingAge:age,
      ping:build??land,note,cancellation:"",special:suspicious.test(note),
      sourcePeriod:null,latitude:null,longitude:null,locationPrecision:"unlocated"
    });
  }
  check(rows.length>0,"Excel沒有可讀取的有效成交案例");
  return {rows,skipped,filename:file.name,sheets:sheets.map(s=>s.name),
    notice:"本次資料來自使用者上傳的內政部Excel；只在瀏覽器工作階段使用，並非匯入既有實價登錄主資料庫。官方查詢來源、圈選範圍及交易條件須由經紀人核對。"};
}
