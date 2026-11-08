import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getSupabaseEnv, getRequestContext } from "@/lib/supabase/env";

export const runtime = "edge";
const STAGING_URL = "https://niorteztdbuyusemsgwa.supabase.co";
const KINDS: Record<string, string> = {
  "透天住宅": "透天厝",
  "華廈": "華廈",
  "公寓": "公寓",
  "電梯大樓": "住宅大樓",
  "店住": "店面",
};
function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
export async function GET(request: Request) {
  // This endpoint is exclusively for authenticated staff on the isolated
  // Staging-backed feature Preview. Production remains strictly fail-closed.
  try { await requireRole(["editor", "admin", "owner"]); }
  catch { return bad("not_authorized", 403); }
  const url = new URL(request.url);
  const env = getSupabaseEnv();
  const branch = process.env.CF_PAGES_BRANCH || getRequestContext()?.env?.CF_PAGES_BRANCH;
  if (!url.hostname.endsWith(".good-m2-cc.pages.dev")
    || branch !== "feature/real-price-public-search-v1"
    || env.url !== STAGING_URL) {
    return bad("staging_preview_only", 503);
  }
  const p = url.searchParams;
  const district = (p.get("district") || "").trim();
  const keyword = (p.get("keyword") || "").trim().normalize("NFKC").replace(/\s/g, "");
  const kind = p.get("kind") || "";
  const months = Number(p.get("months") || "12");
  function numeric(name: string) {
    const value = p.get(name);
    if (!value) return null;
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error("invalid_numeric");
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 100000000) throw new Error("invalid_numeric");
    return n;
  }
  let minPrice:number|null,maxPrice:number|null,minPing:number|null,maxPing:number|null;
  try {
    minPrice=numeric("minPrice"); maxPrice=numeric("maxPrice");
    minPing=numeric("minPing"); maxPing=numeric("maxPing");
  } catch {return bad("invalid_range");}
  if ((minPrice!==null&&maxPrice!==null&&minPrice>maxPrice) ||
      (minPing!==null&&maxPing!==null&&minPing>maxPing)) return bad("invalid_range");
  if (!/^[\p{Script=Han}]{2,5}$/u.test(district)
    || (keyword && (!/^[\p{Script=Han}0-9之-]{1,35}$/u.test(keyword)))
    || !["透天住宅", "華廈", "公寓", "電梯大樓", "店住", "土地", "預售屋"].includes(kind)
    || ![12, 24, 36].includes(months)) return bad("invalid_search_conditions");
  const now = new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate()))
    .toISOString().slice(0, 10);
  const selected = "id,source_record_key,source_period_date,transaction_date,district,address_display,dataset_type,target_category,building_pattern,building_age_years,land_area_sqm,building_area_sqm,total_price_ntd,raw_record,latitude,longitude,location_precision";
  const db = createSupabaseAdminClient();
  let q = db.from("moi_preview_transactions").select(selected)
    .eq("county", "彰化縣").eq("district", district)
    .gte("transaction_date", cutoff)
    .lte("transaction_date", now.toISOString().slice(0, 10));
  if (kind === "土地") q = q.eq("dataset_type", "sale").eq("target_category", "land");
  else if (kind === "預售屋") q = q.eq("dataset_type", "presale");
  else q = q.eq("dataset_type", "sale").eq("target_category", "house_land")
    .ilike("building_pattern", KINDS[kind] + "%");
  // Inputs are in NT$10,000 and 坪; normalized official data use NTD and sqm.
  if (minPrice !== null) q=q.gte("total_price_ntd", minPrice*10000);
  if (maxPrice !== null) q=q.lte("total_price_ntd", maxPrice*10000);
  const sizeColumn=kind==="土地"?"land_area_sqm":"building_area_sqm";
  if (minPing !== null) q=q.gte(sizeColumn, minPing*3.305785);
  if (maxPing !== null) q=q.lte(sizeColumn, maxPing*3.305785);
  if (keyword) {
    const safe = keyword.replaceAll("\\", "\\\\");
    q = q.or(`address_display.ilike.%${safe}%,land_section.ilike.%${safe}%`);
  }
  const { data, error } = await q.order("transaction_date", { ascending: false })
    .order("id", { ascending: false }).limit(60);
  if (error) {
    console.error("private_comparables_query_failed", error.code);
    return bad("query_unavailable", 503);
  }
  const rows = (data || []).map(x => {
    const raw = x.raw_record && typeof x.raw_record === "object" && !Array.isArray(x.raw_record)
      ? x.raw_record as Record<string, unknown> : {};
    const note = typeof raw["備註"] === "string" ? raw["備註"].trim() : "";
    const cancellation = typeof raw["解約情形"] === "string" ? raw["解約情形"].trim() : "";
    const price = Number(x.total_price_ntd);
    const suspicious = /親友|員工|共有人|特殊關係|協議價購|政府機關|標售|拍賣|地清|持分|未登記|增建|頂樓加蓋|分件登記|分次登記/.test(note);
    return {
      id: x.id, sourceId: x.source_record_key,
      sourcePeriod: x.source_period_date,
      date: x.transaction_date, area: x.address_display,
      kind: x.building_pattern || (x.dataset_type === "presale" ? "預售屋" : "土地"),
      price: Number.isFinite(price) && price > 0 ? String(Math.round(price / 10000 * 100) / 100) : null,
      ping: x.target_category === "land" ? (x.land_area_sqm == null ? null : Number(x.land_area_sqm) / 3.305785)
        : (x.building_area_sqm == null ? null : Number(x.building_area_sqm) / 3.305785),
      landPing: x.land_area_sqm == null ? null : Math.round(Number(x.land_area_sqm) / 3.305785 * 100) / 100,
      buildingPing: x.building_area_sqm == null ? null : Math.round(Number(x.building_area_sqm) / 3.305785 * 100) / 100,
      floorCount: typeof raw["總樓層數"] === "string" && raw["總樓層數"].trim()
        ? raw["總樓層數"].trim() : null,
      buildingAge: x.building_age_years == null ? null : Number(x.building_age_years),
      // Geometry never inferred from the address. Unknown locations stay excluded from map filtering.
      latitude: x.latitude == null ? null : Number(x.latitude),
      longitude: x.longitude == null ? null : Number(x.longitude),
      locationPrecision: x.location_precision || "unlocated",
      note, cancellation,
      special: Boolean(suspicious || cancellation),
    };
  });
  return NextResponse.json({ data: rows, truncated: rows.length === 60,
    scope: "changhua_staging_staff_preview",
    warning: "候選資料需人工確認生活圈、單價基礎及特殊交易，尚未核准公開查詢"
  }, { headers: { "Cache-Control": "no-store" } });
}
