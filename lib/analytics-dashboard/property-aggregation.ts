import type { PropertyPerformanceRow } from "./contracts.ts";

export type PropertyEventRow = {
  property_id: string | null;
  event_name: string;
  visitor_id: string | null;
  session_id: string | null;
  is_bot?: boolean;
  is_internal?: boolean;
};

export type PropertyMetadataRow = { id: string; title: string; slug: string; status: string };
export type PropertySortKey = "views" | "visitors" | "lineClicks" | "phoneClicks" | "inquiries" | "viewInquiryConversionRate" | "ctaRate";

type MutableRow = {
  propertyId: string;
  visitorIds: Set<string>;
  sessionIds: Set<string>;
  views: number;
  mediaViews: number;
  lineClicks: number;
  phoneClicks: number;
  shares: number;
  mapOpens: number;
  inquiryStarts: number;
  inquiries: number;
};

const roundRate = (numerator: number, denominator: number) => denominator ? Math.round(numerator / denominator * 10_000) / 100 : null;

function defaultCompare(a: PropertyPerformanceRow, b: PropertyPerformanceRow) {
  return b.views - a.views || b.inquiries - a.inquiries || a.propertyId.localeCompare(b.propertyId);
}

function compare(key: PropertySortKey, a: PropertyPerformanceRow, b: PropertyPerformanceRow) {
  if (key === "viewInquiryConversionRate" || key === "ctaRate") {
    const qualified = Number(b.views >= 5) - Number(a.views >= 5);
    return qualified || (b[key] ?? -1) - (a[key] ?? -1) || b.views - a.views || b.inquiries - a.inquiries;
  }
  return b[key] - a[key] || (key === "views" ? b.inquiries - a.inquiries : b.views - a.views);
}

export function sortPropertyRows(rows: PropertyPerformanceRow[], key: PropertySortKey) {
  return rows.map((row, index) => ({ row, index })).sort((a, b) =>
    compare(key, a.row, b.row) || a.row.propertyId.localeCompare(b.row.propertyId) || a.index - b.index
  ).map(({ row }) => row);
}

export function aggregatePropertyRows(events: PropertyEventRow[], metadata: PropertyMetadataRow[] = []): PropertyPerformanceRow[] {
  const groups = new Map<string, MutableRow>();
  for (const event of events) {
    if (!event.property_id || event.is_bot || event.is_internal) continue;
    let row = groups.get(event.property_id);
    if (!row) {
      row = { propertyId: event.property_id, visitorIds: new Set(), sessionIds: new Set(), views: 0, mediaViews: 0, lineClicks: 0, phoneClicks: 0, shares: 0, mapOpens: 0, inquiryStarts: 0, inquiries: 0 };
      groups.set(event.property_id, row);
    }
    if (event.visitor_id) row.visitorIds.add(event.visitor_id);
    if (event.session_id) row.sessionIds.add(event.session_id);
    if (event.event_name === "view_property") row.views += 1;
    if (event.event_name === "view_property_media") row.mediaViews += 1;
    if (event.event_name === "click_line") row.lineClicks += 1;
    if (event.event_name === "click_phone") row.phoneClicks += 1;
    if (event.event_name === "share_property") row.shares += 1;
    if (event.event_name === "open_map") row.mapOpens += 1;
    if (event.event_name === "start_inquiry") row.inquiryStarts += 1;
    if (event.event_name === "inquiry_created") row.inquiries += 1;
  }
  const metadataById = new Map(metadata.map((property) => [property.id, property]));
  return [...groups.values()].map(({ visitorIds, sessionIds, ...row }) => {
    const property = metadataById.get(row.propertyId);
    const ctaActions = row.lineClicks + row.phoneClicks + row.inquiryStarts;
    return {
      ...row,
      title: property?.title ?? null,
      slug: property?.slug ?? null,
      status: property?.status ?? null,
      visitors: visitorIds.size,
      sessions: sessionIds.size,
      viewInquiryConversionRate: roundRate(row.inquiries, row.views),
      ctaRate: roundRate(ctaActions, row.views)
    };
  }).sort(defaultCompare);
}
