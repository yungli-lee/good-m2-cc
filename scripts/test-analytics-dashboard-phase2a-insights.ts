import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { PropertyPerformanceRow } from "../lib/analytics-dashboard/contracts.ts";
import { classifyLowConversionInsights, MIN_INSIGHT_COHORT_SIZE, MIN_PROPERTY_PUBLISHED_DAYS, MIN_PROPERTY_VIEWS, publishedDays } from "../lib/analytics-dashboard/insights.ts";

const now = new Date("2026-08-07T12:00:00.000Z");
const base = (id: string, overrides: Partial<PropertyPerformanceRow> = {}): PropertyPerformanceRow => ({
  propertyId: id, title: `物件 ${id}`, slug: `property-${id}`, status: "published", firstPublishedAt: "2026-07-01T00:00:00.000Z",
  views: 30, visitors: 10, sessions: 10, mediaViews: 0, lineClicks: 0, phoneClicks: 0, shares: 0, mapOpens: 0,
  inquiryStarts: 0, inquiries: 0, viewInquiryConversionRate: 0, ctaRate: 0, ...overrides
});

assert.equal(MIN_PROPERTY_PUBLISHED_DAYS, 14);
assert.equal(MIN_INSIGHT_COHORT_SIZE, 5);
assert.deepEqual(MIN_PROPERTY_VIEWS, { today: 5, "7d": 10, "30d": 20, "90d": 50 });
assert.equal(publishedDays("2026-07-24T15:59:59.000Z", now), 14, "Taipei calendar-day age is deterministic");

const backgrounds = [base("b1", { views: 20, inquiries: 1, viewInquiryConversionRate: 10, ctaRate: 20 }), base("b2", { views: 20, inquiries: 1, viewInquiryConversionRate: 10, ctaRate: 20 }), base("b3", { views: 20, inquiries: 1, viewInquiryConversionRate: 10, ctaRate: 20 }), base("b4", { views: 20, inquiries: 1, viewInquiryConversionRate: 10, ctaRate: 20 })];

const lowCta = classifyLowConversionInsights([...backgrounds, base("low-cta")], "30d", now);
assert.equal(lowCta.rows[0].signal, "HIGH_VIEW_LOW_CTA");
assert.equal(lowCta.rows[0].reasonCode, "HIGH_VIEWS_LOW_CONVERSION");
assert.equal(lowCta.rows[0].severity, "high");
assert.equal(lowCta.rows[0].cohortSize, 5);
assert.equal(lowCta.rows[0].minimumViews, 20);

const highCta = classifyLowConversionInsights([...backgrounds, base("high-cta", { lineClicks: 3, ctaRate: 30 })], "30d", now);
assert.equal(highCta.rows[0].signal, "HIGH_CTA_NO_INQUIRY");
assert.equal(highCta.rows[0].reasonCode, "HIGH_CTA_ZERO_INQUIRY");
assert.equal(highCta.rows[0].severity, "medium");

const lowInquiryBackground = [base("c1", { views: 20, inquiries: 2, viewInquiryConversionRate: 20, ctaRate: 10 }), base("c2", { views: 20, inquiries: 2, viewInquiryConversionRate: 20, ctaRate: 10 }), base("c3", { views: 20, inquiries: 2, viewInquiryConversionRate: 20, ctaRate: 10 }), base("c4", { views: 20, inquiries: 2, viewInquiryConversionRate: 20, ctaRate: 10 })];
const lowInquiry = classifyLowConversionInsights([...lowInquiryBackground, base("low-inquiry", { inquiries: 1, viewInquiryConversionRate: 5, lineClicks: 1, ctaRate: 20 })], "30d", now);
assert.equal(lowInquiry.rows[0].signal, "HIGH_VIEW_LOW_INQUIRY");
assert.equal(lowInquiry.rows[0].severity, "medium");

const belowSample = classifyLowConversionInsights([...backgrounds, base("small", { views: 4, visitors: 2 })], "30d", now);
assert.equal(belowSample.rows.length, 0, "below minimum sample is not classified");
const newListing = classifyLowConversionInsights([...backgrounds, base("new", { firstPublishedAt: "2026-08-01T00:00:00.000Z" })], "30d", now);
assert.equal(newListing.rows.length, 0, "new listing is excluded from the eligible cohort");
const insufficient = classifyLowConversionInsights([base("only-one")], "30d", now);
assert.equal(insufficient.rows.length, 0);
assert.equal(insufficient.insufficientCohort, true);
assert.equal(insufficient.thresholds.effectiveMinimumViews, null);
const missing = classifyLowConversionInsights([...backgrounds, base("missing", { title: null, slug: null, status: null, firstPublishedAt: null })], "30d", now);
assert.equal(missing.rows.length, 0, "missing metadata cannot become a false positive");

const tied = classifyLowConversionInsights([...backgrounds, base("z"), base("a")], "30d", now);
assert.deepEqual(tied.rows.map((item) => item.property.propertyId), ["a", "z"], "severity, views, visitors, property ID produce stable ordering");

const page = readFileSync("app/admin/analyze/page.tsx", "utf8");
const service = readFileSync("lib/analytics-dashboard/insight-service.ts", "utf8");
const route = readFileSync("app/api/admin/analyze/insights/route.ts", "utf8");
const component = readFileSync("components/admin/analytics/property-insights.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
assert.match(page, /classifyLowConversionInsights\(propertiesResult\.value\.rows, range\)/, "page reuses the already-loaded property aggregation");
assert.equal((page.match(/getAnalyticsProperties\(range, environment\)/g) || []).length, 1, "page scans property events once");
assert.match(service, /getAnalyticsProperties\(range, environment\)/);
assert.doesNotMatch(service, /analytics_events|properties.*select|event_properties|phone|email|message/i);
assert.match(route, /requireApiRole\(\["admin", "owner"\]\)/);
assert.match(route, /private, no-store/);
assert.match(component, /目前沒有需要特別關注的物件/);
assert.match(component, /資料量不足，暫不判定/);
assert.doesNotMatch(component, /不好賣|沒有市場|建議降價|AI|LLM/);
assert.match(css, /analytics-insight-grid[\s\S]*grid-template-columns: 1fr/);

console.log("Analytics Dashboard Phase 2A-5 insight tests: PASS");
