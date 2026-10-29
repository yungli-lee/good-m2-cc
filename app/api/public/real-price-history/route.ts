import {NextResponse} from "next/server";
import {createSupabaseAdminClient} from "@/lib/supabase/server";
import {getSupabaseEnv,getRequestContext} from "@/lib/supabase/env";
import {buildHistoryGroups,eligibleHistoryAddress,type HistoryMaster,type HistoryDetail} from "@/lib/real-price/history";
export const runtime="edge";
const columns="id,county,district,dataset_type,target_category,address_display,floor_display,building_pattern,source_record_key,source_period_date,transaction_date,total_price_ntd,land_area_sqm,building_area_sqm,raw_record";
export async function POST(request:Request){
  const env=getSupabaseEnv(),branch=process.env.CF_PAGES_BRANCH||getRequestContext()?.env?.CF_PAGES_BRANCH;
  if(!new URL(request.url).hostname.endsWith(".good-m2-cc.pages.dev")||branch!=="feature/real-price-public-search-v1"||env.url!=="https://niorteztdbuyusemsgwa.supabase.co")return NextResponse.json({error:"not_ready"},{status:503});
  try{
    const body=await request.text();if(body.length>2048)return NextResponse.json({error:"invalid_ids"},{status:400});
    const parsed:unknown=JSON.parse(body);
    const ids:unknown=parsed&&typeof parsed==="object"&&"ids" in parsed?parsed.ids:null;
    if(!Array.isArray(ids)||ids.length<1||ids.length>20||ids.some(id=>!Number.isSafeInteger(id)||id<1))return NextResponse.json({error:"invalid_ids"},{status:400});
    const db=createSupabaseAdminClient(),signal=AbortSignal.timeout(12000);
    const anchorResult=await db.from("moi_preview_transactions").select(columns).in("id",[...new Set(ids)]).abortSignal(signal);
    if(anchorResult.error)throw new Error("anchors_unavailable");
    const anchors=(anchorResult.data||[]) as unknown as HistoryMaster[];
    const areas=new Map<string,HistoryMaster[]>();
    for(const row of anchors){if(!eligibleHistoryAddress(row))continue;const key=JSON.stringify([row.county,row.district]);const group=areas.get(key)||[];group.push(row);areas.set(key,group);}
    const candidates:HistoryMaster[]=[];
    // All available periods: never apply the list's date, price, area, road or page filters.
    for(const rows of areas.values()){
      const addresses=[...new Set(rows.map(row=>eligibleHistoryAddress(row)!))];
      for(let offset=0;;offset+=1000){
        const result=await db.from("moi_preview_transactions").select(columns).eq("dataset_type","sale").eq("county",rows[0].county).eq("district",rows[0].district).in("address_display",addresses).order("id").range(offset,offset+999).abortSignal(signal);
        if(result.error)throw new Error("history_unavailable");
        candidates.push(...((result.data||[]) as unknown as HistoryMaster[]));
        if(candidates.length>2000)throw new Error("history_too_large");
        if(!result.data||result.data.length<1000)break;
      }
    }
    const details:HistoryDetail[]=[],candidateIds=[...new Set(candidates.map(row=>row.id))];
    for(let start=0;start<candidateIds.length;start+=200){
      for(let offset=0;;offset+=1000){
        const result=await db.from("moi_transaction_details").select("transaction_id,detail_type,section_name,parcel_number,ownership_share_numerator,ownership_share_denominator").in("transaction_id",candidateIds.slice(start,start+200)).order("id").range(offset,offset+999).abortSignal(signal);
        if(result.error)throw new Error("details_unavailable");
        details.push(...((result.data||[]) as HistoryDetail[]));
        if(details.length>20000)throw new Error("history_too_large");
        if(!result.data||result.data.length<1000)break;
      }
    }
    return NextResponse.json({histories:buildHistoryGroups(anchors,candidates,details),scope:"all_imported_sale_records"},{headers:{"Cache-Control":"no-store"}});
  }catch{
    // Do not turn a failed/partial lookup into a claim that there is no history.
    return NextResponse.json({error:"history_unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
