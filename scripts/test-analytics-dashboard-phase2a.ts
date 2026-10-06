import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getAnalyticsPeriod, parseAnalyticsRange } from "../lib/analytics-dashboard/date-range.ts";
import { rateComparison, safeChange, safeRate } from "../lib/analytics-dashboard/metrics.ts";

assert.equal(parseAnalyticsRange("today"), "today");
assert.equal(parseAnalyticsRange("7d"), "7d");
assert.equal(parseAnalyticsRange("30d"), "30d");
assert.equal(parseAnalyticsRange("90d"), "90d");
assert.equal(parseAnalyticsRange("invalid"), "30d");
assert.equal(parseAnalyticsRange(null), "30d");

const today = getAnalyticsPeriod("today", new Date("2026-08-07T04:30:00.000Z"));
assert.deepEqual(today, {
  start: "2026-08-06T16:00:00.000Z",
  end: "2026-08-07T16:00:00.000Z",
  previousStart: "2026-08-05T16:00:00.000Z",
  previousEnd: "2026-08-06T16:00:00.000Z"
});
const sevenDays = getAnalyticsPeriod("7d", new Date("2026-08-07T15:59:59.000Z"));
assert.equal(sevenDays.start, "2026-07-31T16:00:00.000Z");
assert.equal(sevenDays.previousStart, "2026-07-24T16:00:00.000Z");
assert.equal(sevenDays.previousEnd, sevenDays.start);
assert.equal(getAnalyticsPeriod("30d", new Date("2026-08-07T16:00:00.000Z")).end, "2026-08-08T16:00:00.000Z");
assert.equal(getAnalyticsPeriod("90d", new Date("2026-08-07T00:00:00.000Z")).previousEnd, "2026-05-09T16:00:00.000Z");

assert.equal(safeChange(0, 0), null);
assert.equal(safeChange(10, 0), null);
assert.equal(safeChange(15, 10), 0.5);
assert.equal(safeRate(0, 0), null);
assert.equal(safeRate(2, 10), 0.2);
assert.deepEqual(rateComparison(0, 0, 0, 0), { current: 0, previous: 0, changePercent: null, numerator: 0, denominator: 0 });

const route = readFileSync("app/api/admin/analyze/summary/route.ts", "utf8");
const service = readFileSync("lib/analytics-dashboard/summary.ts", "utf8");
const page = readFileSync("app/admin/analyze/page.tsx", "utf8");
const layout = readFileSync("app/admin/layout.tsx", "utf8");
assert.match(route, /requireApiRole\(\["admin", "owner"\]\)/, "API restricts access to admin and owner");
assert.match(route, /private, no-store/, "API response is private and uncached");
assert.match(service, /\.eq\("environment", environment\)/, "every service query isolates runtime environment");
assert.match(service, /\.eq\("is_bot", false\)/);
assert.match(service, /\.eq\("is_internal", false\)/);
assert.match(service, /\.gte\("occurred_at", start\)/);
assert.match(service, /\.lt\("occurred_at", end\)/);
assert.match(service, /MAX_ID_ROWS = 50_000/, "identity scan has a hard performance gate");
const projections = [...service.matchAll(/\.select\("([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual([...new Set(projections)].sort(), ["id", "session_id", "visitor_id"], "service projection contains only aggregate and identity fields");
assert.match(page, /requireRole\(\["admin", "owner"\]\)/, "page independently enforces role");
assert.match(page, /today: "今天"/);
assert.match(page, /"7d": "7 天"/);
assert.match(page, /"30d": "30 天"/);
assert.match(page, /"90d": "90 天"/);
assert.match(layout, /href="\/admin\/analyze"/);

console.log("Analytics Dashboard Phase 2A-1 tests: PASS");
