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
