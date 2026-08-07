import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { combineSummaryMetrics } from "../lib/analytics-dashboard/summary-presentation.ts";

const combined = combineSummaryMetrics(
  { current: 3, previous: 2, changePercent: 0.5 },
  { current: 2, previous: 2, changePercent: 0 }
);
assert.deepEqual(combined, { current: 5, previous: 4, changePercent: 0.25 }, "contact interactions aggregate LINE and phone without changing either KPI");
assert.equal(combineSummaryMetrics({ current: 1, previous: 0, changePercent: null }, { current: 0, previous: 0, changePercent: null }).changePercent, null, "zero prior denominator remains guarded");

const page = readFileSync("app/admin/analyze/page.tsx", "utf8");
const summary = readFileSync("components/admin/analytics/summary-overview.tsx", "utf8");
const metric = readFileSync("components/admin/analytics/metric-card.tsx", "utf8");
const insights = readFileSync("components/admin/analytics/property-insights.tsx", "utf8");
const inquiries = readFileSync("components/admin/analytics/recent-inquiry-attribution.tsx", "utf8");
const properties = readFileSync("components/admin/analytics/property-performance.tsx", "utf8");
const sources = readFileSync("components/admin/analytics/source-performance.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

const order = ["<SummaryOverview", "<PropertyInsights", "<RecentInquiryAttribution", "<TrendChart", "<PropertyPerformance", "<SourcePerformance"].map((token) => page.indexOf(token));
assert.ok(order.every((index) => index >= 0));
assert.deepEqual(order, [...order].sort((a, b) => a - b), "dashboard sections follow the business information hierarchy");
assert.match(summary, /label="詢問"[\s\S]*label="詢問轉換率"[\s\S]*label="物件瀏覽"[\s\S]*label="訪客"[\s\S]*label="聯絡互動"/);
assert.match(summary, /metrics\.lineClicks, metrics\.phoneClicks/);
assert.match(summary, /label="LINE 點擊"[\s\S]*label="電話點擊"[\s\S]*label="造訪次數"/);
assert.match(metric, /analytics-metric-card-compact/);

assert.match(page, /預覽環境/);
assert.match(page, /台北時間/);
assert.doesNotMatch(page, />Preview<|>Asia\/Taipei</);
assert.match(properties, /聯絡互動率/);
assert.doesNotMatch(properties, />CTA Rate<|>Sessions /);
assert.doesNotMatch(sources, /first-touch|lead-touch|attribution|>Sessions </i);
assert.match(insights, /需要關注的物件（\{insights\.rows\.length\}）/);
assert.match(insights, /優先查看/);
assert.match(insights, /值得檢查/);
assert.doesNotMatch(insights, />High<|>Medium<|嚴重|警告紅/);
assert.match(insights, /<summary>判定方式<\/summary>/);
assert.match(insights, /同期間物件比較門檻/);
assert.match(insights, /目前沒有需要特別關注的物件/);
assert.match(insights, /目前資料量不足，暫不進行物件比較/);
assert.doesNotMatch(insights, /percentile threshold|p75|p25/i);

assert.match(inquiries, /首次來源/);
assert.match(inquiries, /詢問來源/);
assert.match(inquiries, /最近一次非直接來源/);
assert.match(inquiries, /使用詢問送出當下的來源紀錄，後續瀏覽不會改寫/);
assert.doesNotMatch(inquiries, /First touch|Lead touch|Last non-direct|immutable attribution snapshot/);

assert.match(css, /analytics-trend-chart \{[^}]*height: 340px/);
assert.match(css, /analytics-trend-chart \{ min-width: 0; height: 280px/);
assert.match(css, /analytics-summary-primary \{ grid-template-columns: repeat\(2/);
assert.match(css, /analytics-summary-secondary \{ grid-template-columns: repeat\(3/);
assert.match(css, /analytics-range \{ position: sticky/);
assert.match(css, /flex-wrap: nowrap/);
assert.match(css, /min-height: 44px/);
assert.match(css, /width: min\(100% - 32px/);
assert.match(css, /overflow-wrap: anywhere/);

console.log("Analytics Dashboard Phase 2A-Final UI hierarchy tests: PASS");
