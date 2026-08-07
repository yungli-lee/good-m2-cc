import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  aggregateSourceRows,
  normalizeCampaign,
  normalizeMedium,
  normalizeSource,
  sortSourceRows,
  sourceFromReferrer,
  type SourceEventRow
} from "../lib/analytics-dashboard/source-aggregation.ts";

assert.equal(normalizeSource(null), "direct");
assert.equal(normalizeSource(""), "direct");
assert.equal(normalizeSource(" UNKNOWN "), "direct");
assert.equal(normalizeSource(" Facebook "), "facebook");
assert.equal(normalizeSource(null, "https://www.google.com/search?q=house"), "google.com");
assert.equal(sourceFromReferrer("invalid"), null);
assert.equal(normalizeMedium(null), "(none)");
assert.equal(normalizeMedium(" Social "), "social");
assert.equal(normalizeCampaign(null), "(none)");
assert.equal(normalizeCampaign(" Summer Home "), "Summer Home");

const base = (overrides: Partial<SourceEventRow>): SourceEventRow => ({
  event_name: "page_view", visitor_id: "v1", session_id: "s1", utm_source: "facebook",
  utm_medium: "social", utm_campaign: "summer", referrer: null, ...overrides
});
const rows = aggregateSourceRows([
  base({}),
  base({ event_name: "view_property" }),
  base({ event_name: "click_line", session_id: "s2" }),
  base({ event_name: "click_phone", visitor_id: "v2", session_id: "s2" }),
  base({ event_name: "inquiry_created", visitor_id: "v2", session_id: "s2" }),
  base({ event_name: "inquiry_created", visitor_id: null, session_id: null, utm_source: "direct", utm_medium: null, utm_campaign: null })
]);
assert.deepEqual(rows.find((row) => row.source === "direct"), {
  source: "direct", medium: "(none)", campaign: "(none)", propertyViews: 0, lineClicks: 0,
  phoneClicks: 0, inquiries: 1, visitors: 0, sessions: 0, conversionRate: null
});
assert.deepEqual(rows.find((row) => row.source === "facebook"), {
  source: "facebook", medium: "social", campaign: "summer", propertyViews: 1, lineClicks: 1,
  phoneClicks: 1, inquiries: 1, visitors: 2, sessions: 2, conversionRate: 50
});

const facebook = rows.find((row) => row.source === "facebook")!;
const lowSample = { ...facebook, source: "tiny", visitors: 1, inquiries: 1, conversionRate: 100 };
const qualified = { ...facebook, source: "steady", visitors: 5, inquiries: 2, conversionRate: 40 };
assert.equal(sortSourceRows([lowSample, qualified], "conversionRate")[0].source, "steady", "conversion sort prioritizes the minimum visitor sample");
assert.deepEqual(sortSourceRows([qualified, { ...qualified }], "visitors"), [qualified, { ...qualified }], "stable sort preserves equal rows");
assert.deepEqual(aggregateSourceRows([]), []);

const service = readFileSync("lib/analytics-dashboard/sources.ts", "utf8");
const route = readFileSync("app/api/admin/analyze/sources/route.ts", "utf8");
const page = readFileSync("app/admin/analyze/page.tsx", "utf8");
const component = readFileSync("components/admin/analytics/source-performance.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
assert.match(service, /MAX_SOURCE_ROWS = 50_000/);
assert.match(service, /select\("id,event_name,visitor_id,session_id,occurred_at,utm_source,utm_medium,utm_campaign,referrer"\)/);
assert.match(service, /\.eq\("environment", environment\)/);
assert.match(service, /\.eq\("is_bot", false\)/);
assert.match(service, /\.eq\("is_internal", false\)/);
assert.doesNotMatch(service, /lead_attributions|first_source|lead_source|last_source|received_at|event_properties|phone|email|message|cookie|token/i);
assert.match(route, /requireApiRole\(\["admin", "owner"\]\)/);
assert.match(route, /private, no-store/);
assert.match(page, /getAnalyticsSources\(range, environment\)/);
assert.match(component, /這個期間尚無可歸類的來源資料/);
assert.match(component, /至少 5 位訪客/);
assert.match(component, /analytics-source-mobile/);
assert.match(css, /analytics-source-mobile h3[\s\S]*overflow-wrap: anywhere/);

console.log("Analytics Dashboard Phase 2A-3 source tests: PASS");
