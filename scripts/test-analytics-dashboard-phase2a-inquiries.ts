import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatAttributionTouch, joinRecentInquiryAttributions, normalizeAttributionStatus, type LeadAttributionRow, type SafeInquiryRow } from "../lib/analytics-dashboard/recent-inquiry-attribution.ts";

const inquiry = (id: string, status = "complete", propertyId: string | null = "property-1", createdAt = "2026-08-07T09:00:00.000Z"): SafeInquiryRow => ({ id, property_id: propertyId, created_at: createdAt, attribution_status: status });
const attribution = (id: string, overrides: Partial<LeadAttributionRow> = {}): LeadAttributionRow => ({
  inquiry_id: id, property_id: "property-1", attribution_status: "complete",
  first_source: "facebook", first_medium: "social", first_campaign: "summer",
  lead_source: "direct", lead_medium: null, lead_campaign: null,
  last_source: "facebook", last_medium: "social", last_campaign: "summer",
  first_seen_at: "2026-08-01T01:00:00.000Z", inquiry_at: "2026-08-07T09:00:00.000Z", ...overrides
});
const properties = [{ id: "property-1", title: "很長但安全顯示的物件名稱".repeat(5), slug: "property-one", status: "published" }];

const complete = joinRecentInquiryAttributions([inquiry("complete")], [attribution("complete")], properties)[0];
assert.equal(complete.attributionStatus, "complete");
assert.deepEqual(complete.firstTouch, { source: "facebook", medium: "social", campaign: "summer" });
assert.deepEqual(complete.leadTouch, { source: "direct", medium: null, campaign: null });
assert.deepEqual(complete.lastNonDirect, { source: "facebook", medium: "social", campaign: "summer" });
assert.equal(complete.propertyTitle, properties[0].title);
assert.equal(complete.propertySlug, "property-one");

const partial = joinRecentInquiryAttributions([inquiry("partial", "partial")], [attribution("partial", { attribution_status: "partial", last_source: null })], properties)[0];
assert.equal(partial.attributionStatus, "partial");
assert.equal(partial.lastNonDirect, null);
const missing = joinRecentInquiryAttributions([inquiry("missing", "missing")], [], properties)[0];
assert.equal(missing.attributionStatus, "missing");
assert.equal(missing.firstTouch, null);
const failed = joinRecentInquiryAttributions([inquiry("failed", "failed")], [], properties)[0];
assert.equal(failed.attributionStatus, "failed");
assert.equal(normalizeAttributionStatus("pending"), "missing");

assert.deepEqual(formatAttributionTouch({ source: "direct", medium: null, campaign: null }), { sourceMedium: "direct / (none)", campaign: "(none)" });
assert.deepEqual(formatAttributionTouch(null), { sourceMedium: "—", campaign: "—" });

const unknownProperty = joinRecentInquiryAttributions([inquiry("unknown", "missing", "deleted-property")], [], properties)[0];
assert.equal(unknownProperty.propertyId, "deleted-property");
assert.equal(unknownProperty.propertyTitle, null);
assert.equal(unknownProperty.propertySlug, null);

const ordered = joinRecentInquiryAttributions([
  inquiry("z", "missing", null, "2026-08-07T08:00:00.000Z"),
  inquiry("b", "missing", null, "2026-08-07T09:00:00.000Z"),
  inquiry("a", "missing", null, "2026-08-07T09:00:00.000Z")
], [], []);
assert.deepEqual(ordered.map((row) => row.inquiryId), ["a", "b", "z"], "newest then inquiry ID ordering is stable");

const service = readFileSync("lib/analytics-dashboard/recent-inquiries.ts", "utf8");
const route = readFileSync("app/api/admin/analyze/inquiries/route.ts", "utf8");
const page = readFileSync("app/admin/analyze/page.tsx", "utf8");
const component = readFileSync("components/admin/analytics/recent-inquiry-attribution.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
assert.match(service, /select\("id,property_id,created_at,attribution_status"\)/, "inquiry query uses an explicit safe projection");
assert.match(service, /lead_attributions/);
assert.match(service, /\.in\("inquiry_id", inquiryIds\)/, "attribution rows are batch joined");
assert.match(service, /\.in\("id", propertyIds\)/, "property rows are batch joined");
assert.equal((service.match(/\.from\(/g) || []).length, 3, "service has a fixed maximum of three queries");
assert.doesNotMatch(service, /analytics_events|event_properties/i, "immutable attribution is never recalculated from events");
assert.doesNotMatch(service, /select\([^\n]*(name|phone|email|message|ip_hash|user_agent|internal_note|cookie|token)/i, "PII is not selected");
assert.match(route, /requireApiRole\(\["admin", "owner"\]\)/);
assert.match(route, /private, no-store/);
assert.match(page, /getAnalyticsRecentInquiries\(range, environment\)/);
assert.match(component, /這個期間尚無詢問/);
assert.match(component, /已下架／未知物件/);
assert.match(component, /完整/);
assert.match(component, /部分/);
assert.match(component, /無歸因資料/);
assert.match(component, /歸因失敗/);
assert.match(css, /analytics-inquiry-mobile[\s\S]*display: grid/);
assert.match(css, /analytics-inquiry-mobile dl \{ grid-template-columns: 1fr/);

const serialized = JSON.stringify([complete, partial, missing, failed]);
assert.doesNotMatch(serialized, /name|phone|email|message|ip_hash|user_agent|internal_note|cookie|token/i, "serialized API rows contain no PII fields");
console.log("Analytics Dashboard Phase 2A-6 recent inquiry tests: PASS");
