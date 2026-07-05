import { todayTaipeiDate } from "./timeline.ts";

export type ExpirableProperty = {
  id: string;
  title: string;
  slug?: string | null;
  status: string;
  listing_end_date: string | null;
};

export type ExpiredListingResult = {
  id: string;
  title: string;
  listing_end_date: string;
  expired_at?: string;
};

export function todayDateString() {
  return todayTaipeiDate();
}

export function isListingExpired(listingEndDate: string | null | undefined, today = todayDateString()) {
  return Boolean(listingEndDate && listingEndDate < today);
}

export function selectExpiredPublishedListings(properties: ExpirableProperty[], today = todayDateString()): ExpirableProperty[] {
  return properties.filter((property) => property.status === "published" && isListingExpired(property.listing_end_date, today));
}

export function expireListingsSummaryParam(results: ExpiredListingResult[]) {
  return encodeURIComponent(JSON.stringify(results.map((result) => ({
    title: result.title,
    listing_end_date: result.listing_end_date
  }))));
}

export function expiredListingTimelineContent(listingEndDate: string) {
  return `委託期限 ${listingEndDate.replaceAll("-", "/")} 已到期，系統自動下架`;
}

export function nextDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

export function taipeiDayTimestampRange(date = todayDateString()) {
  return {
    start: `${date}T00:00:00+08:00`,
    end: `${nextDateString(date)}T00:00:00+08:00`
  };
}

export async function countTodayAutoExpiredListings() {
  const { createSupabaseServerClient } = await import("../supabase/server");
  const supabase = await createSupabaseServerClient();
  const range = taipeiDayTimestampRange();
  const { count, error } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("status", "expired")
    .is("deleted_at", null)
    .gte("expired_at", range.start)
    .lt("expired_at", range.end);

  if (error) {
    console.error("auto_expired_count_failed", { code: error.code, message: error.message?.slice(0, 180) });
    return 0;
  }

  return count || 0;
}
