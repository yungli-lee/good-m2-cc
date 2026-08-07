import type { AttributionTouch, InquiryAttributionStatus, RecentInquiryAttributionRow } from "./contracts.ts";

export type SafeInquiryRow = { id: string; property_id: string | null; created_at: string; attribution_status: string };
export type LeadAttributionRow = {
  inquiry_id: string; property_id: string | null; attribution_status: string;
  first_source: string; first_medium: string | null; first_campaign: string | null;
  lead_source: string; lead_medium: string | null; lead_campaign: string | null;
  last_source: string | null; last_medium: string | null; last_campaign: string | null;
  first_seen_at: string; inquiry_at: string;
};
export type InquiryPropertyRow = { id: string; title: string; slug: string; status: string };

const statuses = new Set<InquiryAttributionStatus>(["complete", "partial", "missing", "failed"]);
export function normalizeAttributionStatus(value: string | null | undefined): InquiryAttributionStatus {
  return value && statuses.has(value as InquiryAttributionStatus) ? value as InquiryAttributionStatus : "missing";
}

function touch(source: string | null, medium: string | null, campaign: string | null): AttributionTouch | null {
  return source ? { source, medium, campaign } : null;
}

export function joinRecentInquiryAttributions(inquiries: SafeInquiryRow[], attributions: LeadAttributionRow[], properties: InquiryPropertyRow[]) {
  const attributionByInquiry = new Map(attributions.map((row) => [row.inquiry_id, row]));
  const propertyById = new Map(properties.map((row) => [row.id, row]));
  return inquiries.map((inquiry): RecentInquiryAttributionRow => {
    const attribution = attributionByInquiry.get(inquiry.id);
    const propertyId = attribution?.property_id || inquiry.property_id;
    const property = propertyId ? propertyById.get(propertyId) : undefined;
    return {
      inquiryId: inquiry.id,
      inquiryAt: attribution?.inquiry_at || inquiry.created_at,
      propertyId: propertyId || null,
      propertyTitle: property?.title || null,
      propertySlug: property?.slug || null,
      propertyStatus: property?.status || null,
      attributionStatus: normalizeAttributionStatus(attribution?.attribution_status || inquiry.attribution_status),
      firstTouch: attribution ? touch(attribution.first_source, attribution.first_medium, attribution.first_campaign) : null,
      leadTouch: attribution ? touch(attribution.lead_source, attribution.lead_medium, attribution.lead_campaign) : null,
      lastNonDirect: attribution ? touch(attribution.last_source, attribution.last_medium, attribution.last_campaign) : null,
      firstSeenAt: attribution?.first_seen_at || null
    };
  }).sort((a, b) => b.inquiryAt.localeCompare(a.inquiryAt) || a.inquiryId.localeCompare(b.inquiryId));
}

export function formatAttributionTouch(value: AttributionTouch | null) {
  if (!value) return { sourceMedium: "—", campaign: "—" };
  return { sourceMedium: `${value.source} / ${value.medium || "(none)"}`, campaign: value.campaign || "(none)" };
}
