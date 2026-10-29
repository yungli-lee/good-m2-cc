export type HistoryMaster = {
  id:number; county:string; district:string; dataset_type:string; target_category:string;
  address_display:string|null; floor_display:string|null; building_pattern:string|null;
  source_record_key:string; source_period_date:string|null; transaction_date:string;
  total_price_ntd:number|null; land_area_sqm:number|null; building_area_sqm:number|null;
  raw_record?:Record<string,unknown>|null;
};
export type HistoryDetail = {transaction_id:number;detail_type:string;section_name:string|null;parcel_number:string|null;ownership_share_numerator:number|null;ownership_share_denominator:number|null};
export type HistoryEntry = {id:number;transaction_date:string;total_price_ntd:number|null;land_area_sqm:number|null;building_area_sqm:number|null;official_note:string|null};
const normalized=(s:string)=>s.normalize("NFKC").replace(/\s/g,"");
const parcelIdentity=(value:string)=>{
  const text=normalized(value).replace(/地號$/,"");
  const padded=/^(\d{4})(\d{4})$/.exec(text);
  if(padded)return `${Number(padded[1])}:${Number(padded[2])}`;
  const displayed=/^(\d+)(?:-(\d+))?$/.exec(text);
  return displayed?`${Number(displayed[1])}:${Number(displayed[2]||0)}`:text;
};
export function eligibleHistoryAddress(row:HistoryMaster):string|null {
  const address=row.address_display?.trim();
  if(row.dataset_type!=="sale"||!address||/[／/、,，;；~～]/.test(address)||/[0-9０-９一二三四五六七八九十]至[0-9０-９一二三四五六七八九十]/.test(address))return null;
  if(row.target_category==="land")return /地號/.test(address)?address:null;
  if(!["house_land","building"].includes(row.target_category)||!/[0-9０-９一二三四五六七八九十]+(?:之[0-9０-９]+)?號/.test(address)||/地號/.test(address))return null;
  // An apartment building's door number without a unit/floor does not identify a home.
  if(/大樓|華廈|公寓/.test(row.building_pattern||"")&&!/[樓層]/.test(address))return null;
  return address;
}
function identity(row:HistoryMaster,details:HistoryDetail[]):string|null {
  const address=eligibleHistoryAddress(row);
  const lands=details.filter(d=>d.transaction_id===row.id&&d.detail_type==="land");
  if(!address||!lands.length||lands.some(d=>!d.section_name||!d.parcel_number))return null;
  // Do not merge different land bundles at the same door number.
  const parcels=[...new Set(lands.map(d=>normalized(d.section_name!)+":"+parcelIdentity(d.parcel_number!)))].sort();
  if(row.target_category==="land"){
    // A sale of a different share is not evidence of reselling the same interest.
    if(lands.some(d=>d.ownership_share_numerator==null||!d.ownership_share_denominator))return null;
    const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
    const shares=lands.map(d=>{const n=d.ownership_share_numerator!,v=d.ownership_share_denominator!,g=gcd(n,v);return `${normalized(d.section_name!)}:${parcelIdentity(d.parcel_number!)}:${n/g}/${v/g}`;}).sort();
    return JSON.stringify([row.county,row.district,"land",normalized(address),shares]);
  }
  // Without a registered building number, changed sale areas cannot establish
  // that the same rights (rather than a partial/bundled sale) changed hands.
  if(row.land_area_sqm==null||row.building_area_sqm==null)return null;
  return JSON.stringify([row.county,row.district,"home",normalized(address),/[樓層]/.test(address)?null:normalized(row.floor_display||""),parcels,Number(row.land_area_sqm).toFixed(2),Number(row.building_area_sqm).toFixed(2)]);
}
const canonicalSource=(key:string)=>key.replace(/^moi:a:n:/,"n:a:").replace(/^moi:/,"");
export function buildHistoryGroups(anchors:HistoryMaster[],candidates:HistoryMaster[],details:HistoryDetail[]):Record<string,HistoryEntry[]> {
  const groups=new Map<string,HistoryMaster[]>();
  for(const row of candidates){const key=identity(row,details);if(key){const group=groups.get(key)||[];group.push(row);groups.set(key,group);}}
  const output:Record<string,HistoryEntry[]>={};
  for(const anchor of anchors){
    const key=identity(anchor,details);if(!key)continue;
    const sourceSeen=new Set<string>(),eventSeen=new Set<string>();
    const unique=(groups.get(key)||[]).slice().sort((a,b)=>(b.source_period_date||"").localeCompare(a.source_period_date||"")||b.id-a.id).filter(row=>{
      const source=canonicalSource(row.source_record_key);
      const event=JSON.stringify([row.transaction_date,row.total_price_ntd,row.land_area_sqm,row.building_area_sqm]);
      if(sourceSeen.has(source)||eventSeen.has(event))return false;
      sourceSeen.add(source);eventSeen.add(event);return true;
    }).sort((a,b)=>b.transaction_date.localeCompare(a.transaction_date)||b.id-a.id);
    if(unique.length<2)continue;
    output[String(anchor.id)]=unique.map(row=>({id:row.id,transaction_date:row.transaction_date,total_price_ntd:row.total_price_ntd,land_area_sqm:row.land_area_sqm,building_area_sqm:row.building_area_sqm,official_note:typeof row.raw_record?.["備註"]==="string"?row.raw_record["備註"]:null}));
  }
  return output;
}
