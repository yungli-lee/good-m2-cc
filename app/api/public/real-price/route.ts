import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
export const runtime = "edge";
const TARGETS = new Set(["house_land","land","building","parking"]);
function decimal(s: string | null) { if(!s) return undefined; if(!/^\d+(?:\\.\d+)?$/.test(s)) throw new Error("bad number"); const n=Number(s); if(!Number.isFinite(n)||n>1e14) throw new Error("bad number"); return n; }
function textFilter(s: string | null) { if(!s) return undefined; const v=s.trim(); if(v.length>80||/[%,_*()]/.test(v)) throw new Error("bad text"); return v||undefined; }
function dateFilter(s: string | null) { if(!s) return undefined; if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s))) throw new Error("bad date"); return s; }
export async function GET(request: Request) {
  // Explicit opt-in, never open a service-role public endpoint by deploying the route alone.
  if(process.env.REAL_PRICE_PUBLIC_SEARCH_ENABLED!=="true") return NextResponse.json({error:"not_ready",message:"實價登錄資料尚未開放查詢"},{status:503,headers:{"Cache-Control":"no-store"}});
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
    const db=createSupabaseAdminClient();
    let q=db.from("moi_verified_transactions").select("id,county,district,dataset_type,transaction_date,target_category,total_price_ntd,land_area_sqm,building_area_sqm,building_age_years,road_name,land_section,building_pattern",{count:"exact"})
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
    if(road)q=q.ilike("road_name",`%${road}%`);
    if(section)q=q.ilike("land_section",`%${section}%`);
    const {data,error,count}=await q.order("transaction_date",{ascending:false}).order("id",{ascending:false}).range((page-1)*limit,page*limit-1);
    if(error) {console.error("real_price_query_error",error.code);return NextResponse.json({error:"query_unavailable"},{status:503});}
    return NextResponse.json({data:data||[],total:count??0,page,limit},{headers:{"Cache-Control":"public, s-maxage=60"}});
  } catch(e) {
    if(e instanceof Error&&e.message==="mixed_area")return NextResponse.json({error:"mixed_area",message:"土地與房地混合篩選時，請先取消坪數條件"},{status:400});
    return NextResponse.json({error:"invalid_query"},{status:400});
  }
}
