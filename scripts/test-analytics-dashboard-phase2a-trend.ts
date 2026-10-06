import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTrendSeries, getTrendGranularity, type TrendEventRow } from "../lib/analytics-dashboard/trend-buckets.ts";

const now = new Date("2026-08-07T06:30:00.000Z"); // 14:30 Asia/Taipei
assert.equal(getTrendGranularity("today"), "hour");
assert.equal(getTrendGranularity("7d"), "day");
assert.equal(getTrendGranularity("30d"), "day");
assert.equal(getTrendGranularity("90d"), "day");

const rows: TrendEventRow[] = [
  { event_name: "page_view", visitor_id: "v1", occurred_at: "2026-08-06T16:05:00.000Z" },
  { event_name: "page_view", visitor_id: "v1", occurred_at: "2026-08-06T16:20:00.000Z" },
  { event_name: "view_property", visitor_id: "v2", occurred_at: "2026-08-06T17:05:00.000Z" },
  { event_name: "inquiry_created", visitor_id: "v2", occurred_at: "2026-08-06T17:25:00.000Z" },
  { event_name: "page_view", visitor_id: null, occurred_at: "2026-08-06T18:00:00.000Z" },
  { event_name: "page_view", visitor_id: "future", occurred_at: "2026-08-07T07:00:00.000Z" }
];
const hourly = buildTrendSeries("today", rows, now);
assert.equal(hourly.length, 15, "today includes 00:00 through current Taipei hour");
assert.equal(hourly[0].bucket, "00:00");
assert.equal(hourly.at(-1)?.bucket, "14:00");
assert.equal(hourly[0].visitors, 1, "visitor is distinct inside each bucket");
assert.deepEqual(hourly[1], { bucket: "01:00", bucketStart: "2026-08-06T17:00:00.000Z", visitors: 1, propertyViews: 1, inquiries: 1 });
assert.deepEqual(hourly[3], { bucket: "03:00", bucketStart: "2026-08-06T19:00:00.000Z", visitors: 0, propertyViews: 0, inquiries: 0 }, "missing bucket is zero-filled");

const daily = buildTrendSeries("7d", [
  { event_name: "view_property", visitor_id: "v1", occurred_at: "2026-08-01T15:59:59.000Z" },
  { event_name: "view_property", visitor_id: "v2", occurred_at: "2026-08-01T16:00:00.000Z" }
], now);
assert.equal(daily.length, 7);
assert.equal(daily[0].bucket, "2026-08-01");
assert.equal(daily[0].propertyViews, 1, "Taipei boundary keeps pre-midnight event on Aug 1");
assert.equal(daily[1].bucket, "2026-08-02");
assert.equal(daily[1].propertyViews, 1);
assert.deepEqual(daily.map((point) => point.bucket), [...daily.map((point) => point.bucket)].sort(), "buckets stay ordered");

const service = readFileSync("lib/analytics-dashboard/trend.ts", "utf8");
const route = readFileSync("app/api/admin/analyze/trend/route.ts", "utf8");
const page = readFileSync("app/admin/analyze/page.tsx", "utf8");
assert.match(service, /select\("id,event_name,visitor_id,occurred_at"\)/);
assert.match(service, /\.eq\("environment", environment\)/);
assert.match(service, /\.eq\("is_bot", false\)/);
assert.match(service, /\.eq\("is_internal", false\)/);
assert.doesNotMatch(service, /received_at|event_properties|phone|email|message|cookie|token/i);
assert.match(route, /requireApiRole\(\["admin", "owner"\]\)/);
assert.match(route, /private, no-store/);
assert.match(page, /Promise\.allSettled/, "trend errors do not remove summary cards");
assert.match(page, /<TrendChart/);

console.log("Analytics Dashboard Phase 2A-2 trend tests: PASS");
