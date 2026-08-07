# Analytics Dashboard Phase 2A — Implementation Plan

## Recommended architecture

```text
/admin/analyze Server Component
  -> authenticated admin analytics service
     -> server-only Supabase client
        -> environment/time-bounded queries
  -> small client islands for range, sort, and chart interaction
```

### Options considered

| Option | Security | Cost/performance | Maintainability | Decision |
|---|---|---|---|---|
| Browser direct Supabase SELECT | RLS can protect it, but exposes query shape and increases accidental data surface | multiple browser queries, weak centralized caching | duplicated logic | Reject for Dashboard V1. |
| Admin server API/service | service role remains server-only; explicit field allowlist | centralized bounded queries and response shaping | best fit with current Next/Edge architecture | Recommended. |
| SQL RPC/views | strong aggregation and index use | best at 100K+ rows | requires reviewed migration and versioned contract | Introduce only when implementation query plans justify it. |
| Rollup tables/materialized views | strong large-volume performance | refresh/consistency complexity | premature at current volume | Defer until sustained 100K–1M rows or latency SLO breach. |

V1 responses use `private, no-store`. A later short-lived server cache may key on role-safe environment and normalized range; never share cached admin responses with public users.

Future GA4 or Google Ads support belongs behind a versioned provider adapter. The dashboard service continues to read canonical first-party `analytics_events` and immutable lead attribution; it must not couple KPI queries to provider schemas or equate first-party visitor/session IDs with external identity. Reconciliation is a separate, source-labelled slice with explicit freshness, timezone, attribution-window, consent, and mapping-version metadata. Phase 2A adds no tags, credentials, exports, external calls, or provider schema.

## Proposed code organization

No files below are created in this discovery phase. Intended implementation paths:

- `app/admin/analyze/page.tsx`
- `app/api/admin/analyze/summary/route.ts`
- `app/api/admin/analyze/trend/route.ts`
- `app/api/admin/analyze/sources/route.ts`
- `app/api/admin/analyze/properties/route.ts`
- `app/api/admin/analyze/insights/route.ts`
- `app/api/admin/analyze/inquiries/route.ts`
- `lib/analytics-dashboard/date-range.ts`
- `lib/analytics-dashboard/metrics.ts`
- `lib/analytics-dashboard/queries.ts`
- `lib/analytics-dashboard/contracts.ts`
- `lib/analytics-dashboard/insights.ts`
- `components/admin/analytics/*`
- `scripts/test-analytics-dashboard-phase2a.ts`

API routes may be collapsed into one endpoint after measuring payload and latency; separate contracts are listed to keep slices independently releasable.

## 2A-1 — Analytics API + summary metrics

### Files/API

- Add date-range, contract, metric math, and server query modules.
- Add `/api/admin/analyze/summary` and `/admin/analyze` shell.
- Add admin navigation link visible to admin/owner only.

### Query

- Current and equal prior period.
- Environment, time, bot, and internal filters applied at query source.
- Select only event name, identity IDs, inquiry/property IDs, and time.

### Tests

- Taipei range boundaries, DST-independent Taiwan dates, prior period.
- zero denominator and previous-zero comparison.
- admin/owner 200; editor/viewer/public denied.
- Preview/Production isolation.

### Acceptance

- Seven cards agree with documented SQL definitions.
- No PII in response.
- 0-event state has no NaN/Infinity.

### Risk

- In-process distinct aggregation becomes expensive if a broad raw-event read grows beyond early volume. Record row count and latency in Preview.

## 2A-2 — Trend chart

### Files/API

- Add `/api/admin/analyze/trend`.
- Add trend chart and accessible table components.
- Evaluate and, only if approved, add Recharts; otherwise use a tested accessible SVG component.

### Query

- Group by Taipei date from `occurred_at`.
- Zero-fill missing dates in the service layer.

### Tests

- UTC/Taipei boundary cases.
- 7/30/90 point counts.
- zero-only, one-day, and normal series.
- mobile width and accessible table.

### Acceptance

- Visitors, property views, and inquiries display for every date.
- No blank chart or hydration warning.

### Risk

- Chart dependency bundle size and Edge/client serialization.

## 2A-3 — Source attribution table

### Files/API

- Add `/api/admin/analyze/sources`.
- Add source normalization and source table.

### Query

- Assign first qualifying period touch to visitors/sessions.
- Aggregate event engagement and lead-attribution inquiries by normalized source/medium/campaign.

### Tests

- direct, blank, UTM case normalization, referral, and unknown values.
- non-additive visitor warning.
- missing attribution and content derived through touch ID.

### Acceptance

- Table is sortable and shows denominators.
- Direct and unattributed traffic are not silently dropped.

### Risk

- Event-level and immutable attribution models can answer different questions. UI must name the selected model.

## 2A-4 — Property performance

### Files/API

- Add `/api/admin/analyze/properties`.
- Add property performance table/list and sort controls.

### Query

- Aggregate by `property_id`, then join only safe current property fields: title, slug, status, published date.
- Keep site-wide null-property CTA outside property rows.

### Tests

- archived/deleted/current property labels.
- null property IDs.
- unique visitor/session counts and rate boundaries.
- sort stability and pagination/limit.

### Acceptance

- Views, visitors, LINE, phone, inquiries, and conversion match fixture SQL.
- Mobile compact list is usable.

### Risk

- Current property title/status differs from event-time metadata. Document snapshot/current semantics.

## 2A-5 — Low-conversion insights

### Files/API

- Add `/api/admin/analyze/insights` or include insights with property response.
- Add percentile/minimum-sample functions and explanation component.

### Query

- Use eligible cohort, published age, minimum views, p75 views, and p25 conversion.
- Return thresholds and reason codes.

### Tests

- fewer than five eligible properties.
- new listings excluded.
- small samples excluded.
- percentile ties, all-zero inquiries, zero denominator.
- deterministic output ordering.

### Acceptance

- Every insight exposes its numbers and formula.
- No causal language or AI-generated copy.

### Risk

- Initial Production volume may yield no insight; this is correct and must be treated as a valid state.

## 2A-6 — Recent inquiry attribution

### Files/API

- Add `/api/admin/analyze/inquiries`.
- Add recent attribution table/cards.

### Query

- Read `lead_attributions` joined to safe property fields.
- Include inquiries with missing/failed status through a safe ID/time/status projection.
- Limit and paginate; default 20 newest.

### Tests

- complete, partial, missing, and failed states.
- PII denylist in serialized response.
- immutable snapshot rendering.
- admin/owner only.

### Acceptance

- Time, property, three touches, and status display.
- No name, phone, email, message, IP, or internal note reaches the browser.

### Risk

- Joining missing attributions must not accidentally select full inquiry rows.

## Cross-slice test strategy

### Unit

- date ranges and Taipei conversion;
- rates, prior comparison, zero denominators;
- source normalization;
- percentiles, sample thresholds, and deterministic insight reasons.

### Integration

- admin auth and role boundary;
- Production/Preview isolation;
- RLS and service-role boundary;
- real Supabase query shape with safe selected columns;
- query row limits and error sanitization.

### UI

- 0, low, and normal data;
- mobile/tablet/desktop;
- sorting/range filters;
- accessibility and no hydration errors.

### Regression

- CRM Phase 1/2A;
- CMS;
- property list/detail and inquiry form;
- Analytics Phase 1 event ingestion and attribution;
- production and Pages builds.
- canonical KPI fixtures remain unchanged when future provider adapters are absent or return different totals.

## Performance gates

Before each slice release, capture:

- selected raw row count;
- database/query duration;
- API duration and response bytes;
- server CPU/Cloudflare exceptions;
- browser bundle impact for chart code.

Proposed escalation triggers, configurable after observation:

- any 90-day request reads more than 50,000 raw events;
- p95 API duration exceeds 750 ms in Preview/Production;
- source/property aggregation needs more than two large event scans;
- total rows approach 100,000 and query plans show sequential scans.

At a trigger, review SQL RPC/views and compound indexes. At sustained 1M rows or repeated refresh cost, design daily rollups. Do not build a warehouse in Phase 2A.

## Release sequence for future implementation

1. Correct branch ancestry to latest `origin/main`.
2. Implement one slice only.
3. Run focused and full regression gates.
4. Deploy Preview and verify with real low-volume data, without fake runtime data.
5. Review query plans and security response fields.
6. Release only after explicit approval.

No migration is currently required for 2A-1 at low volume. Any later view, RPC, index, or rollup requires a separate additive migration proposal and approval.
