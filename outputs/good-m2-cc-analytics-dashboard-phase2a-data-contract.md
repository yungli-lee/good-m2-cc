# Analytics Dashboard Phase 2A — Data Contract

## Global query contract

Every analytics query receives:

```ts
type AnalyticsRangePreset = "today" | "7d" | "30d" | "90d";
type AnalyticsEnvironment = "production" | "preview";

type AnalyticsQueryContext = {
  environment: AnalyticsEnvironment;
  preset: AnalyticsRangePreset;
  timezone: "Asia/Taipei";
  currentStartUtc: string;
  currentEndUtc: string;      // exclusive
  previousStartUtc: string;
  previousEndUtc: string;     // exclusive
};
```

Production `/admin/analyze` always fixes `environment = production`. Preview fixes `environment = preview`. The browser cannot choose another environment.

All behavioral metrics apply:

```sql
environment = :runtime_environment
and occurred_at >= :start_utc
and occurred_at < :end_utc
and is_bot = false
and is_internal = false
```

`received_at` is reserved for ingestion latency and health checks.

## Taipei date boundaries

- Today: Taipei midnight through the next Taipei midnight.
- 7/30/90 days: current Taipei calendar day plus the preceding 6/29/89 full days.
- The previous period has equal duration and ends exactly at the current period start.
- Convert the two Taipei instants to UTC before sending the query.
- Daily grouping uses `(occurred_at AT TIME ZONE 'Asia/Taipei')::date`.
- Never use `occurred_at::date` directly.

## Numeric conventions

```ts
function safeRate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function safeChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}
```

- Store ratios internally as `0..1`; format as percentages at the UI boundary.
- A null rate or change renders `—`, never `0%`, `NaN`, or `Infinity`.
- Counts are integers. Do not estimate or extrapolate low-volume counts.

## Summary metrics

| Metric | Numerator/definition | Notes |
|---|---|---|
| Visitors | `count(distinct visitor_id)` | exclude null identity |
| Sessions | `count(distinct session_id)` | exclude null identity |
| Property views | `count(*) where event_name='view_property'` | event count |
| LINE clicks | `count(*) where event_name='click_line'` | site-wide plus property CTA |
| Phone clicks | `count(*) where event_name='click_phone'` | site-wide plus property CTA |
| Inquiries | `count(*) where event_name='inquiry_created'` | authoritative success |
| Inquiry conversion | distinct inquiry visitors / visitors | also return numerator and denominator |

Each summary metric returns:

```ts
type MetricComparison = {
  value: number;
  previousValue: number;
  changeRate: number | null;
  numerator?: number;
  denominator?: number;
};
```

## Trend contract

One row per Taipei calendar day, including zero-filled dates:

```ts
type AnalyticsTrendPoint = {
  date: string; // YYYY-MM-DD in Asia/Taipei
  visitors: number;
  propertyViews: number;
  inquiries: number;
};
```

Today can use an hourly operational view later, but V1 stays daily for consistency.

## Source normalization

Normalize for grouping without mutating stored data:

1. trim and lowercase source/medium;
2. blank source becomes `direct`;
3. blank medium under direct becomes `(none)`;
4. blank campaign becomes `(not set)`;
5. preserve unknown nonblank values instead of guessing channel taxonomy;
6. label `legacy_unknown` environment separately and exclude it from V1.

```ts
type SourcePerformanceRow = {
  source: string;
  medium: string;
  campaign: string;
  visitors: number;
  sessions: number;
  propertyViews: number;
  lineClicks: number;
  phoneClicks: number;
  inquiries: number;
  conversionRate: number | null;
};
```

V1 acquisition rows use the first qualifying touch per visitor/session in the selected period. Inquiry counts use the immutable lead-attribution snapshot matching that source tuple. The table footer must not sum visitor rows if the selected model permits a person in more than one row.

## Property performance

```ts
type PropertyPerformanceRow = {
  propertyId: string;
  title: string;
  slug: string | null;
  status: string | null;
  firstPublishedAt: string | null;
  views: number;
  visitors: number;
  sessions: number;
  mediaViews: number;
  lineClicks: number;
  phoneClicks: number;
  shares: number;
  mapOpens: number;
  inquiryStarts: number;
  inquiries: number;
  viewToInquiryRate: number | null;
  ctaRate: number | null;
};
```

- `viewToInquiryRate = distinct inquiry visitors / distinct property viewers`.
- `ctaRate = distinct sessions with click_line or click_phone / distinct property-view sessions`.
- A CTA with null `property_id` is not assigned to a property.
- An inquiry property uses `lead_attributions.property_id`, falling back to `inquiries.property_id` only when the attribution snapshot is missing.

## “Popular but low inquiry” definition

The rule is cohort-based and deterministic:

1. Cohort: published properties with at least 14 calendar days since `published_at` and activity in the selected range.
2. Minimum sample: at least `max(configuredMinimumViews, cohort p25 view count)` views. Recommended initial configurable minimum: 20 views for 30-day mode; scale to 10/30/50 for 7/90-day modes after observing traffic.
3. Popular: views at or above the cohort 75th percentile.
4. Low inquiry: inquiry conversion below the cohort 25th percentile **and** at least one view; zero-inquiry rows qualify once the sample threshold is met.
5. Require at least five eligible properties. Otherwise show “資料量不足，暫不判定”.

Return the thresholds with every result so the UI can explain the decision:

```ts
type LowConversionInsight = {
  property: PropertyPerformanceRow;
  reasonCode: "HIGH_VIEWS_LOW_CONVERSION" | "HIGH_CTA_ZERO_INQUIRY";
  cohortSize: number;
  minimumViews: number;
  viewPercentileThreshold: number;
  conversionPercentileThreshold: number;
};
```

This is correlation, not causation. Copy must say “值得檢查” rather than claiming price, content, or agent behavior caused the result.

## Recent inquiry attribution

```ts
type RecentInquiryAttributionRow = {
  inquiryId: string;
  inquiryAt: string;
  propertyId: string | null;
  propertyTitle: string | null;
  firstTouch: { source: string; medium: string | null; campaign: string | null } | null;
  leadTouch: { source: string; medium: string | null; campaign: string | null } | null;
  lastNonDirect: { source: string; medium: string | null; campaign: string | null } | null;
  attributionStatus: "complete" | "partial" | "missing" | "failed";
};
```

Explicitly forbidden response fields: inquiry name, phone, email, message, IP hash, user agent, internal note, cookies, tokens, and raw arbitrary metadata.

## Deterministic insight rules

V1 may emit only rules with visible inputs:

- `HIGH_VIEWS_ZERO_INQUIRY`: eligible property is above popular threshold and has zero inquiries.
- `HIGH_CTA_ZERO_INQUIRY`: property has at least the minimum view sample, CTA rate at/above cohort p75, and zero inquiries.
- `SOURCE_HIGH_VIEWS_LOW_CTA`: source has at least 20 property-view sessions, property views at/above source p75, and LINE+phone session rate below source p25.
- `CAMPAIGN_ABOVE_AVERAGE_CONVERSION`: campaign has at least 10 visitors and conversion exceeds the weighted site conversion rate; show both rates and denominators.

Thresholds are configuration inputs returned in the API response, not hard-coded inside UI copy.

## API response envelope

```ts
type AnalyticsResponse<T> = {
  ok: true;
  data: T;
  meta: {
    environment: "production" | "preview";
    timezone: "Asia/Taipei";
    currentStartUtc: string;
    currentEndUtc: string;
    generatedAt: string;
    lowData: boolean;
  };
};
```

Errors return stable codes and no database details. Admin responses use `Cache-Control: private, no-store` in V1.

## External analytics adapter boundary

The types and formulas above are the canonical first-party dashboard contract. A future GA4 or Google Ads integration must translate through a versioned adapter and must not change these definitions in place.

```ts
type ExternalAnalyticsMapping = {
  provider: "ga4" | "google_ads";
  mappingVersion: string;
  canonicalEventName: string;
  externalEventName: string;
  parameterMap: Record<string, string>;
};
```

- Store provider event names, property/customer IDs, conversion-action IDs, click IDs, and sync metadata in provider-specific boundaries rather than overloading canonical fields.
- Never map first-party `visitor_id` or `session_id` directly to an external user, client, session, or click identifier.
- Any reconciliation response must name both sources and return their freshness, timezone, attribution window, consent coverage, and mapping version.
- Differences are expected; external totals never overwrite first-party counts or immutable lead-attribution snapshots.
