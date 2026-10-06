import type { SourcePerformanceRow } from "./contracts.ts";

export type SourceEventRow = {
  event_name: string;
  visitor_id: string | null;
  session_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
};
export type SourceSortKey = "visitors" | "propertyViews" | "lineClicks" | "phoneClicks" | "inquiries" | "conversionRate";

type MutableSourceRow = Omit<SourcePerformanceRow, "visitors" | "sessions" | "conversionRate"> & {
  visitorIds: Set<string>;
  sessionIds: Set<string>;
};

const DIRECT_LIKE = new Set(["direct", "(direct)", "none", "(none)", "unknown", "(unknown)", "null", "undefined", "(not set)"]);

function clean(value: string | null | undefined) {
  const normalized = (value || "").trim().toLowerCase();
  return normalized || null;
}

export function sourceFromReferrer(referrer: string | null | undefined) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

export function normalizeSource(source: string | null | undefined, referrer?: string | null) {
  const normalized = clean(source);
  if (normalized && !DIRECT_LIKE.has(normalized)) return normalized;
  if (!normalized) return sourceFromReferrer(referrer) || "direct";
  return "direct";
}

export function normalizeMedium(medium: string | null | undefined) {
  return clean(medium) || "(none)";
}

export function normalizeCampaign(campaign: string | null | undefined) {
  return (campaign || "").trim() || "(none)";
}

function defaultSort(a: SourcePerformanceRow, b: SourcePerformanceRow) {
  return b.inquiries - a.inquiries
    || b.visitors - a.visitors
    || a.source.localeCompare(b.source)
    || a.medium.localeCompare(b.medium)
    || a.campaign.localeCompare(b.campaign);
}

function compareRows(key: SourceSortKey, a: SourcePerformanceRow, b: SourcePerformanceRow) {
  if (key === "conversionRate") {
    const aQualified = a.visitors >= 5 ? 1 : 0;
    const bQualified = b.visitors >= 5 ? 1 : 0;
    return bQualified - aQualified || (b.conversionRate ?? -1) - (a.conversionRate ?? -1) || b.visitors - a.visitors;
  }
  return b[key] - a[key] || (key === "inquiries" ? b.visitors - a.visitors : b.inquiries - a.inquiries);
}

export function sortSourceRows(rows: SourcePerformanceRow[], key: SourceSortKey) {
  return rows.map((row, index) => ({ row, index })).sort((a, b) =>
    compareRows(key, a.row, b.row)
    || a.row.source.localeCompare(b.row.source)
    || a.row.medium.localeCompare(b.row.medium)
    || a.row.campaign.localeCompare(b.row.campaign)
    || a.index - b.index
  ).map(({ row }) => row);
}

export function aggregateSourceRows(events: SourceEventRow[]): SourcePerformanceRow[] {
  const groups = new Map<string, MutableSourceRow>();
  for (const event of events) {
    const source = normalizeSource(event.utm_source, event.referrer);
    const medium = normalizeMedium(event.utm_medium);
    const campaign = normalizeCampaign(event.utm_campaign);
    const key = JSON.stringify([source, medium, campaign]);
    let group = groups.get(key);
    if (!group) {
      group = {
        source, medium, campaign, visitorIds: new Set(), sessionIds: new Set(),
        propertyViews: 0, lineClicks: 0, phoneClicks: 0, inquiries: 0
      };
      groups.set(key, group);
    }
    if (event.visitor_id) group.visitorIds.add(event.visitor_id);
    if (event.session_id) group.sessionIds.add(event.session_id);
    if (event.event_name === "view_property") group.propertyViews += 1;
    if (event.event_name === "click_line") group.lineClicks += 1;
    if (event.event_name === "click_phone") group.phoneClicks += 1;
    if (event.event_name === "inquiry_created") group.inquiries += 1;
  }
  return [...groups.values()].map(({ visitorIds, sessionIds, ...group }) => ({
    ...group,
    visitors: visitorIds.size,
    sessions: sessionIds.size,
    conversionRate: visitorIds.size ? Math.round(group.inquiries / visitorIds.size * 10_000) / 100 : null
  })).sort(defaultSort);
}
