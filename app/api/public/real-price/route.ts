import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getSupabaseEnv, getRequestContext } from "@/lib/supabase/env";
export const runtime = "edge";
const TARGETS = new Set(["house_land","land","building","parking"]);
function decimal(s: string | null) { if(!s) return undefined; if(!/^\d+(?:\.\d+)?$/.test(s)) throw new Error("bad number"); const n=Number(s); if(!Number.isFinite(n)||n>1e14) throw new Error("bad number"); return n; }
function textFilter(s: string | null) { if(!s) return undefined; const v=s.trim(); if(v.length>80||/[%,_*()]/.test(v)) throw new Error("bad text"); return v||undefined; }
function dateFilter(s: string | null) { if(!s) return undefined; if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s))) throw new Error("bad date"); return s; }
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
    const page=Number(rawPage);if(!Number.isSafeInteger(page)||page<1||page>1000)throw new Error("page");
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
    const columns="id,county,district,dataset_type,transaction_date,target_category,total_price_ntd,unit_price_ntd_per_sqm,land_area_sqm,building_area_sqm,building_age_years,road_name,land_section,building_pattern"+(previewStaging?",address_display":"");
    let q=db.from(previewStaging?"moi_real_price_transactions":"moi_verified_transactions").select(columns,{count:"exact"})
      .eq("dataset_type",dataset);
    if(previewStaging)q=q.in("id",[1,2]);
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
    if(road)q=q.ilike("road_name",`%${road}%`);
    if(section)q=q.ilike("land_section",`%${section}%`);
    const {data,error,count}=await q.order("transaction_date",{ascending:false}).order("id",{ascending:false}).range((page-1)*limit,page*limit-1);
    if(error) {console.error("real_price_query_error",error.code);return NextResponse.json({error:"query_unavailable"},{status:503});}
    let output=(data||[]) as Array<Record<string,unknown>>;
    if(previewStaging && output.length){
      const ids=output.map(row=>Number(row.id));
      const detail=await db.from("moi_transaction_details").select("transaction_id,section_name,parcel_number").in("transaction_id",ids).eq("detail_type","land").order("id");
      if(detail.error){console.error("real_price_location_detail_error",detail.error.code);return NextResponse.json({error:"query_unavailable"},{status:503});}
      const byTransaction=new Map<number,string[]>();
      for(const row of detail.data||[]){
        const raw=row.parcel_number||"";
        const match=/^(\d{4})(\d{4})$/.exec(raw);
        const number=match?(String(Number(match[1]))+(Number(match[2])?("-"+Number(match[2])):"")):raw;
        const location=[row.section_name,number?number+"地號":""].filter(Boolean).join(" ");
        if(location){const current=byTransaction.get(row.transaction_id)||[];if(!current.includes(location))current.push(location);byTransaction.set(row.transaction_id,current);}
      }
      output=output.map(row=>{
        const sectionParcels=byTransaction.get(Number(row.id))||[];
        const addr=typeof row.address_display==="string"?row.address_display.trim():"";
        const location_display=[...sectionParcels, ...(addr && !sectionParcels.some(x=>addr.replace(/\s/g,"")===x.replace(/\s/g,""))?[addr]:[])].join("／");
        return {...row,location_display:location_display||null};
      });
    }
    return NextResponse.json({data:output,total:count??0,page,limit,preview_sample:previewStaging},{headers:{"Cache-Control":previewStaging?"no-store":"public, s-maxage=60"}});
  } catch(e) {
    console.error("real_price_request_failure",e instanceof Error?e.message:"unknown");
    if(e instanceof Error&&e.message==="mixed_area")return NextResponse.json({error:"mixed_area",message:"土地與房地混合篩選時，請先取消坪數條件"},{status:400});
    return NextResponse.json({error:"query_failed",message:"查詢服務發生錯誤"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
