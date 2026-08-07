import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aggregatePropertyRows, sortPropertyRows, type PropertyEventRow } from "../lib/analytics-dashboard/property-aggregation.ts";

const event = (property_id: string | null, event_name: string, visitor_id: string | null = "v1", session_id: string | null = "s1", extra: Partial<PropertyEventRow> = {}): PropertyEventRow => ({ property_id, event_name, visitor_id, session_id, ...extra });
const events: PropertyEventRow[] = [
  event("p1", "view_property"), event("p1", "view_property", "v1", "s2"), event("p1", "view_property_media"),
  event("p1", "click_line"), event("p1", "click_phone", "v2", "s2"), event("p1", "share_property"),
  event("p1", "open_map"), event("p1", "start_inquiry"), event("p1", "inquiry_created", "v2", "s2"),
  event("p1", "view_property", null, null, { is_bot: true }), event("p1", "view_property", null, null, { is_internal: true }),
  event(null, "view_property"), event("missing", "inquiry_created", null, null)
];
const rows = aggregatePropertyRows(events, [{ id: "p1", title: "很長的測試物件名稱", slug: "long-home", status: "published" }]);
assert.deepEqual(rows[0], {
  propertyId: "p1", title: "很長的測試物件名稱", slug: "long-home", status: "published",
  views: 2, visitors: 2, sessions: 2, mediaViews: 1, lineClicks: 1, phoneClicks: 1,
  shares: 1, mapOpens: 1, inquiryStarts: 1, inquiries: 1, viewInquiryConversionRate: 100, ctaRate: 100
});
assert.deepEqual(rows[1], {
  propertyId: "missing", title: null, slug: null, status: null, views: 0, visitors: 0, sessions: 0,
  mediaViews: 0, lineClicks: 0, phoneClicks: 0, shares: 0, mapOpens: 0, inquiryStarts: 0, inquiries: 1,
  viewInquiryConversionRate: null, ctaRate: null
});
assert.deepEqual(aggregatePropertyRows([]), []);

const lowSample = { ...rows[0], propertyId: "low", views: 1, inquiries: 1, viewInquiryConversionRate: 100, ctaRate: 200 };
const qualified = { ...rows[0], propertyId: "qualified", views: 5, inquiries: 2, viewInquiryConversionRate: 40, ctaRate: 60 };
assert.equal(sortPropertyRows([lowSample, qualified], "viewInquiryConversionRate")[0].propertyId, "qualified");
assert.equal(sortPropertyRows([lowSample, qualified], "ctaRate")[0].propertyId, "qualified");
assert.equal(sortPropertyRows([{ ...qualified, propertyId: "b" }, { ...qualified, propertyId: "a" }], "views")[0].propertyId, "a");

const service = readFileSync("lib/analytics-dashboard/properties.ts", "utf8");
const route = readFileSync("app/api/admin/analyze/properties/route.ts", "utf8");
const page = readFileSync("app/admin/analyze/page.tsx", "utf8");
const component = readFileSync("components/admin/analytics/property-performance.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
assert.match(service, /MAX_PROPERTY_EVENT_ROWS = 50_000/);
assert.match(service, /select\("id,property_id,event_name,visitor_id,session_id,occurred_at"\)/);
assert.match(service, /\.not\("property_id", "is", null\)/);
assert.match(service, /\.eq\("environment", environment\)/);
assert.match(service, /\.eq\("is_bot", false\)/);
assert.match(service, /\.eq\("is_internal", false\)/);
assert.match(service, /from\("properties"\)\.select\("id,title,slug,status"\)\.in\("id", propertyIds\)/, "metadata is fetched in one batched query");
assert.match(service, /await createSupabaseServerClient\(\)/, "metadata uses the authenticated server client so property RLS remains enforced");
assert.doesNotMatch(service, /event_properties|owner_|owner_name|owner_phone|email|message|address_public|address_private/i);
assert.match(route, /requireApiRole\(\["admin", "owner"\]\)/);
assert.match(route, /private, no-store/);
assert.match(page, /getAnalyticsProperties\(range, environment\)/);
assert.match(component, /這個期間尚無物件瀏覽資料/);
assert.match(component, /已下架／未知物件/);
assert.match(component, /至少 5 次瀏覽/);
assert.match(component, /analytics-property-mobile/);
assert.match(css, /analytics-property-name[\s\S]*overflow-wrap: anywhere/);
assert.match(css, /analytics-property-mobile dl[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);

console.log("Analytics Dashboard Phase 2A-4 property tests: PASS");
