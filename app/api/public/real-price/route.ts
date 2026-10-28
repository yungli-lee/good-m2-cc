import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getSupabaseEnv, getRequestContext } from "@/lib/supabase/env";
import { parseSearchDate } from "@/lib/real-price/date-range";
import { roadSearchPattern } from "@/lib/real-price/road-search";
export const runtime = "edge";
const TARGETS = new Set(["house_land","land","building","parking"]);
function decimal(s: string | null) { if(!s) return undefined; if(!/^\d+(?:\.\d+)?$/.test(s)) throw new Error("bad number"); const n=Number(s); if(!Number.isFinite(n)||n>1e14) throw new Error("bad number"); return n; }
function textFilter(s: string | null) { if(!s) return undefined; const v=s.trim(); if(v.length>80||/[%,_*()]/.test(v)) throw new Error("bad text"); return v||undefined; }
function dateFilter(s: string | null) { if(!s)return undefined;const parsed=parseSearchDate(s);if(!parsed)throw new Error("bad date");return parsed; }
export async function GET(request: Request) {
  // Explicit opt-in, never open a service-role public endpoint by deploying the route alone.
  const hostname=new URL(request.url).hostname;
  const environment=getSupabaseEnv();
  const branch=process.env.CF_PAGES_BRANCH || getRequestContext()?.env?.CF_PAGES_BRANCH;
  const previewStaging=hostname.endsWith(".good-m2-cc.pages.dev")
    && branch==="feature/real-price-public-search-v1"
    && environment.url==="https://niorteztdbuyusemsgwa.supabase.co";
  const publicEnabled=process.env.REAL_PRICE_PUBLIC_SEARCH_ENABLED==="true";
  if(!previewStaging && !publicEnabled) return NextResponse.json({error:"not_ready",message:"實價登錄資料尚未開放查詢"},{status:503,headers:{"Cache-Control":"no-store"}});
  try {
    const p=new URL(request.url).searchParams;
    const county=textFilter(p.get("county"));
    const district=textFilter(p.get("district")); const road=textFilter(p.get("road")); const section=textFilter(p.get("section"));
    const dataset=p.get("dataset")||"sale";
    if(!["sale","presale","rental"].includes(dataset)) throw new Error("dataset");
    const targets=[...new Set(p.getAll("target").flatMap(x=>x.split(",")).filter(Boolean))];
    if(targets.some(x=>!TARGETS.has(x))) throw new Error("target");
    const from=dateFilter(p.get("from")),to=dateFilter(p.get("to"));
    const minPrice=decimal(p.get("min_price")),maxPrice=decimal(p.get("max_price"));
    const minArea=decimal(p.get("min_area_sqm")),maxArea=decimal(p.get("max_area_sqm"));
    const minAge=decimal(p.get("min_age")),maxAge=decimal(p.get("max_age"));
    for(const [a,b] of [[minPrice,maxPrice],[minArea,maxArea],[minAge,maxAge]]) if(a!==undefined&&b!==undefined&&a>b) throw new Error("range");
    if(from&&to&&from>to) throw new Error("dates");
    const rawPage=p.get("page")||"1";if(!/^\d+$/.test(rawPage))throw new Error("page");
    const page=Number(rawPage);if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(page*20))throw new Error("page");
    const limit=20;
    // Mixed land + building area searches require category-aware OR filters; reject rather than return wrong results.
    if((minArea!==undefined||maxArea!==undefined)&&targets.includes("land")&&targets.some(t=>t!=="land")) throw new Error("mixed_area");
    if(!environment.url || !environment.serviceRoleKey) {
      console.error("real_price_server_config_missing",{
        urlConfigured:Boolean(environment.url),
        serverCredentialConfigured:Boolean(environment.serviceRoleKey)
      });
      return NextResponse.json({error:"server_config_missing",message:"Preview 查詢服務尚未設定完成"},{status:503,headers:{"Cache-Control":"no-store"}});
    }
    const db=createSupabaseAdminClient();
    const columns="id,county,district,dataset_type,transaction_date,target_category,total_price_ntd,unit_price_ntd_per_sqm,land_area_sqm,building_area_sqm,building_age_years,road_name,land_section,building_pattern"+(previewStaging?",address_display,raw_record,floor_display":"");
    let q=db.from(previewStaging?"moi_preview_transactions":"moi_verified_transactions").select(columns,{count:"exact"})
      .eq("dataset_type",dataset);
    if(county)q=q.eq("county",county);
    if(district)q=q.eq("district",district);
    if(targets.length)q=q.in("target_category",targets);
    if(from)q=q.gte("transaction_date",from);
    if(to)q=q.lte("transaction_date",to);
    if(minPrice!==undefined)q=q.gte("total_price_ntd",minPrice);
    if(maxPrice!==undefined)q=q.lte("total_price_ntd",maxPrice);
    const areaColumn=targets.length===1&&targets[0]==="land"?"land_area_sqm":"building_area_sqm";
    if(minArea!==undefined)q=q.gte(areaColumn,minArea);
    if(maxArea!==undefined)q=q.lte(areaColumn,maxArea);
    if(minAge!==undefined)q=q.gte("building_age_years",minAge);
    if(maxAge!==undefined)q=q.lte("building_age_years",maxAge);
    if(road) {
      const includeLanes=p.get("include_lanes");
      if(includeLanes!==null && !["true","false"].includes(includeLanes))throw new Error("bad lanes");
      q=q.filter(previewStaging?"address_display":"road_name","match",roadSearchPattern(road,includeLanes!=="false"));
    }
    if(section)q=q.ilike("land_section",`%${section}%`);
    const {data,error,count}=await q.order("transaction_date",{ascending:false}).order("id",{ascending:false}).range((page-1)*limit,page*limit-1);
    if(error) {console.error("real_price_query_error",error.code);return NextResponse.json({error:"query_unavailable"},{status:503});}
    // Page-level duplicate suppression is intentionally not applied here: it would
    // invalidate total counts and pagination. Deduplicate at ingestion/database
    // level using official source identity, preserving the richest detail set.
    let output=(data||[]) as unknown as Array<Record<string,unknown>>;
    if(previewStaging && output.length){
      const ids=output.map(row=>Number(row.id));
      const allDetails:Array<Record<string,unknown>>=[];
      for(let offset=0;;offset+=1000){
        const detail=await db.from("moi_transaction_details").select("transaction_id,detail_type,section_name,parcel_number,building_number,detail_area_sqm,ownership_share_numerator,ownership_share_denominator,parking_type,parking_price_ntd,parking_floor,raw_record").in("transaction_id",ids).order("id").range(offset,offset+999);
        if(detail.error){console.error("real_price_location_detail_error",detail.error.code);return NextResponse.json({error:"query_unavailable"},{status:503});}
        allDetails.push(...(detail.data||[]));
        if(!detail.data||detail.data.length<1000)break;
      }
      const byTransaction=new Map<number,string[]>();
      const detailsByTransaction=new Map<number,Array<Record<string,unknown>>>();
      for(const row of allDetails){
        const transactionId=Number(row.transaction_id);
        const existing=detailsByTransaction.get(transactionId)||[];
        const raw=row.raw_record&&typeof row.raw_record==="object"?row.raw_record as Record<string,unknown>:{};
        const shareWarning=row.detail_type==="land"&&row.ownership_share_numerator==null&&(raw["權利人持分分子"]||raw["權利人持分分母"])?"官方原始持分 "+String(raw["權利人持分分子"]??"未提供")+"／"+String(raw["權利人持分分母"]??"未提供")+"，待核對":null;
        existing.push({detail_type:row.detail_type,section_name:row.section_name,parcel_number:row.parcel_number,building_number:row.building_number,detail_area_sqm:row.detail_area_sqm,ownership_share_numerator:row.ownership_share_numerator,ownership_share_denominator:row.ownership_share_denominator,parking_type:row.parking_type,parking_price_ntd:row.parking_price_ntd,parking_floor:row.parking_floor,share_warning:shareWarning});
        detailsByTransaction.set(transactionId,existing);
        if(row.detail_type!=="land")continue;
        const parcelRaw=typeof row.parcel_number==="string"?row.parcel_number:"";
        const match=/^(\d{4})(\d{4})$/.exec(parcelRaw);
        const number=match?(String(Number(match[1]))+(Number(match[2])?("-"+Number(match[2])):"")):parcelRaw;
        const location=[row.section_name,number?number+"地號":""].filter(Boolean).join(" ");
        if(location){const current=byTransaction.get(transactionId)||[];if(!current.includes(location))current.push(location);byTransaction.set(transactionId,current);}
      }
      output=output.map(row=>{
        const sectionParcels=byTransaction.get(Number(row.id))||[];
        const addr=typeof row.address_display==="string"?row.address_display.trim():"";
        const location_display=[...sectionParcels, ...(addr && !sectionParcels.some(x=>addr.replace(/\s/g,"")===x.replace(/\s/g,""))?[addr]:[])].join("／");
        const raw=row.raw_record&&typeof row.raw_record==="object"?row.raw_record as Record<string,unknown>:{};
        const note=typeof raw["備註"]==="string"&&raw["備註"].trim()?raw["備註"]:"";
        const {raw_record:ignoredRaw,...safeRow}=row;
        void ignoredRaw;
        return {...safeRow,location_display:location_display||null,details:detailsByTransaction.get(Number(row.id))||[],official_note:note||null,history_lookup_key:addr?addr.normalize("NFKC").replace(/\\s/g,""):null};
      });
    }
    return NextResponse.json({data:output,total:count??0,page,limit,preview_sample:previewStaging},{headers:{"Cache-Control":previewStaging?"no-store":"public, s-maxage=60"}});
  } catch(e) {
    console.error("real_price_request_failure",e instanceof Error?e.message:"unknown");
    if(e instanceof Error&&e.message==="mixed_area")return NextResponse.json({error:"mixed_area",message:"土地與房地混合篩選時，請先取消坪數條件"},{status:400});
    return NextResponse.json({error:"query_failed",message:"查詢服務發生錯誤"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
