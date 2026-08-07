# Analytics Dashboard Phase 2A — Discovery

## Scope and baseline

- Product: `yungli-lee/good-m2-cc`
- Intended base: Production `main` at `6f46204c43b0a3383df43ba49c6690a463e34fbb`
- Local discovery tree: `abe2811a1d113beb0f30871e80fd6e78c6fddb8e`
- Branch: `feature/analytics-dashboard-phase2a`
- Base note: remote state was re-fetched and `origin/main` was verified at `6f46204`. The discovery was authored from the Phase 1 tip merged by that commit, and the documentation commit is now based on the verified merge commit.
- This phase changes documentation only. No application, schema, migration, tracking, Preview, or Production changes are included.

## Existing analytics architecture

### Ingestion and identity

1. `AnalyticsProvider` mounts at the root layout and registers page, CTA, map, share, calculator, and inquiry-start tracking.
2. First-party visitor and 30-minute session UUIDs are stored in environment-namespaced local storage, with in-memory fallback.
3. `POST /api/analytics/events` is an Edge Route Handler. It validates an 8 KB JSON payload, enforces event-specific allowlists, rate-limits by hashed IP, classifies bots from user agent, and inserts through the server-held service role.
4. Runtime environment is derived from the Cloudflare branch. `main` is `production`; non-main production builds are `preview`.
5. UTM/referrer acquisition state retains first touch, current-session lead touch, and last non-direct touch.
6. A successful public inquiry stores visitor/session IDs, runs attribution without blocking inquiry success, creates an immutable `lead_attributions` snapshot, and records `inquiry_created`.

### Tables and relevant fields

`analytics_events` contains:

- identity: `event_id`, `visitor_id`, `session_id`
- classification: `event_name`, `event_version`, `source_system`, `environment`, `is_bot`, `is_internal`
- time: `occurred_at`, `received_at`, legacy `created_at`
- entities: `property_id`, `inquiry_id`, `person_id`, `requirement_id`, `entity_type`, `entity_id`
- acquisition: `referrer`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- context: `page_path`, `device_class`, allowlisted `event_properties`

`lead_attributions` stores one immutable snapshot per inquiry:

- inquiry/person/property and visitor/session linkage
- first, lead, and last-non-direct event references
- source, medium, and campaign snapshots for the three attribution positions
- `first_seen_at`, `inquiry_at`, and `attribution_status`

`inquiries` supplies `visitor_id`, `session_id`, `property_id`, `source_page`, `created_at`, and `attribution_status`. Dashboard responses must not select inquiry name, phone, email, message, IP hash, user agent, or internal note.

### Security baseline

- `analytics_events` and `lead_attributions` have RLS and FORCE RLS.
- Anonymous and ordinary browser clients cannot read analytics events.
- Authenticated reads are restricted by the database policy to `admin` and `owner`.
- Public ingestion and attribution use the service role only on the server.
- Event properties have both Zod allowlists and a database sensitive-key constraint.
- The Dashboard route should independently require `admin` or `owner`, even though RLS also checks role.

### Existing admin and UI infrastructure

- Admin authorization is centralized in `requireRole`.
- The admin navigation is rendered in `app/admin/layout.tsx`; there is no `/admin/analyze` entry yet.
- There is no existing analytics dashboard, reusable metric card, report table, or chart component.
- No chart library is installed. The current dependencies are Next, React, Supabase, Zod, and Tiptap.

## Event taxonomy

### Phase 1 versioned events

| Event | Producer | Primary use |
|---|---|---|
| `page_view` | root AnalyticsProvider | traffic and landing/page activity |
| `view_property` | property view tracker | property performance |
| `view_property_media` | property media gallery | media engagement |
| `view_knowledge` | knowledge view tracker | knowledge performance |
| `search_property` | homepage property search | search demand |
| `filter_property` | accepted by API/schema; no active producer found | future filter analysis; currently no observations expected |
| `open_map` | delegated link click handler | local-intent CTA |
| `share_property` | delegated property share handler | sharing intent |
| `use_calculator` | calculator form submit handler | calculator engagement |
| `click_line` | delegated LINE link handler | primary CTA intent |
| `click_phone` | delegated telephone link handler | primary CTA intent |
| `start_inquiry` | inquiry form first focus | form funnel start |
| `submit_inquiry` | homepage service-form submit handler | submit attempt, not confirmed persistence |
| `inquiry_created` | server after successful inquiry creation | authoritative inquiry conversion |

### Retained legacy names

`property_view`, `property_search`, `knowledge_view`, `line_click`, `phone_click`, `inquiry_submit`, `featured_property_click`, `share_click`, `media_view`, `admin_login`, and `person_created` remain accepted for backward compatibility. They are not equivalent to Phase 1 events unless a report explicitly maps them. Phase 2A V1 should exclude `environment = legacy_unknown` and avoid silently combining legacy and versioned names.

## KPI availability

All definitions require `environment = selected_environment`, `is_bot = false`, and `is_internal = false`, and use `occurred_at` within the selected Taipei range unless noted.

### AVAILABLE

- Visitors: distinct non-null `visitor_id`.
- Sessions: distinct non-null `session_id`.
- Page views: count of `page_view`.
- Property views: count of `view_property`.
- Knowledge views: count of `view_knowledge`.
- LINE clicks, phone clicks, map opens, property shares, calculator usage, inquiry starts: counts of their Phase 1 events.
- Inquiry submits: count of `submit_inquiry`; label must say “submit attempts”, because it occurs before API success.
- Inquiry created: count of `inquiry_created`, or successful non-spam inquiries joined to the selected environment. The event is the preferred dashboard numerator.
- Visitor → inquiry and session → inquiry conversion: distinct attributed visitors/sessions with `inquiry_created` divided by distinct visitors/sessions. Missing identity inquiries are excluded from the numerator and reported separately.
- Property view → inquiry conversion: inquiries attributed to a property divided by unique visitors that viewed that property. Report event-count views separately.
- LINE and phone click rates: unique sessions with the CTA divided by unique sessions with the relevant page/property view.
- Inquiry completion rate: `inquiry_created / start_inquiry`; separately show `submit_inquiry / start_inquiry` as form progression.
- First, lead, and last-non-direct source/medium/campaign: from immutable `lead_attributions`.
- UTM source, medium, campaign, content: event-level acquisition dimensions; content is event-only and not snapshotted on `lead_attributions`.
- Per-property views, visitors, sessions, media views, LINE, phone, shares, map opens, inquiry starts, inquiries, conversion, and CTA rate where `property_id` is present.

### PARTIAL

- UTM content attribution to an inquiry: event data exists, but `lead_attributions` does not snapshot content. It can be derived by joining touch event IDs; preserve a visible “derived from touch event” definition.
- Search/filter reporting: `search_property` is produced, but `filter_property` currently has no producer.
- Property CTA and inquiry rates: global/header/footer CTA events can have null `property_id`; exclude them from property rows and report as “site-wide CTA”.
- Inquiry conversion for legacy or identity-missing inquiries: these cannot be assigned to visitors or sessions. Show an unattributed count.
- Source table visitor counts: visitors can appear under multiple event-level sources during a period. For acquisition performance, assign each visitor/session to its first event in the period or use lead attribution; do not sum multi-touch visitor rows as a global total.
- Property metadata history: the event stores a title/category/city/district/price/status snapshot for views, while current property rows may have changed. V1 should use current title/slug for navigation and keep event counts stable.

### NOT AVAILABLE

- CRM stage progression: contacted, showing, negotiation, offer, and deal attribution are not connected to the Phase 1 analytics model.
- Closed-deal count, transaction amount, commission/service fee, ROI, CAC, or revenue by source/campaign/property.
- GA4 cross-source reconciliation.
- Reliable user-level demographic or cross-device identity.
- A true `filter_property` KPI until an active producer is added in a separately approved tracking change.

## GA4 and Google Ads future compatibility

- `analytics_events` remains the canonical first-party behavioral source for the dashboard. GA4 or Google Ads exports must not replace, overwrite, or silently redefine its stored events or KPI formulas.
- Future integrations use a versioned mapping/adapter layer from the canonical event taxonomy to external event names, parameters, campaign identifiers, and conversion actions. Platform-specific fields stay outside the core dashboard contract unless separately approved.
- `visitor_id` and `session_id` are first-party product identifiers. They must not be treated as GA4 `user_id`, `client_id`, `session_id`, Google Ads click identifiers, or cross-device identity. Any future linkage requires explicit consent, retention, privacy, and reconciliation rules.
- Preserve raw UTM values and immutable first/lead/last-non-direct attribution snapshots so later adapters can reconcile campaign reporting without rewriting historical first-party attribution.
- Cross-source comparison must expose source, freshness, timezone, attribution-window, consent, and identity differences. It is a reconciliation view, not an assertion that platform totals should equal first-party totals.
- No GA4 tag, Google Ads tag, export, API credential, schema change, or external network call is part of Phase 2A.

## Data volume and index assessment

### Current indexes

- `(environment, occurred_at desc)` supports range-scoped totals and trends.
- `(environment, event_name, occurred_at desc)` supports event-specific metrics.
- partial visitor/session indexes support attribution sequence reads but do not lead with environment.
- `(property_id, occurred_at desc)` supports one-property history but not a multi-property environment range as efficiently.
- `(inquiry_id, occurred_at desc)` and lead-attribution property/visitor/session/time indexes support inquiry detail and attribution lists.

### Expected behavior by volume

| Rows | Recommended approach |
|---:|---|
| 1K | Server-side filtered event reads and in-process aggregation are acceptable. |
| 10K | Still acceptable for bounded 90-day reads, but select only required columns and paginate recent inquiry rows. |
| 100K | Move summary/trend/source/property aggregation into SQL views or RPC; add compound indexes informed by `EXPLAIN (ANALYZE, BUFFERS)`. |
| 1M | Introduce daily rollups/materialized views with incremental refresh; keep raw events for drill-down and reconciliation. |

Candidate future indexes, only after query plans prove need:

- `(environment, property_id, event_name, occurred_at desc)` for property rankings.
- `(environment, visitor_id, occurred_at)` and `(environment, session_id, occurred_at)` for environment-isolated distinct/funnel queries.
- `(environment, utm_source, utm_medium, occurred_at desc)` for source tables if cardinality and plan justify it.

No new index or rollup is proposed in this discovery-only phase.

## Key risks and blockers

1. Branch ancestry is verified at `origin/main` `6f46204`; future implementation must re-fetch and confirm the base again before coding begins.
2. Very low initial Production data makes percentage comparisons volatile. V1 must show raw denominators and suppress misleading changes.
3. `submit_inquiry` is an attempt, while `inquiry_created` is authoritative success. UI labels must not conflate them.
4. Distinct visitor attribution by source is non-additive in multi-touch reporting.
5. Timezone conversion must be performed before querying; grouping raw UTC dates would shift Taiwan day boundaries.
6. Fetching all raw events will not scale past early volumes; implementation must include an explicit threshold for SQL aggregation.
