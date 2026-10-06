# CMS Phase 1 — Homepage Section Registry

## Contract

The registry accepts only published, non-archived `site_pages`. Known CMS
mappings are:

| CMS page type/key | Homepage section |
|---|---|
| `philosophy` | `philosophy` |
| `services` | `services` |
| `contact` | `team` |
| `reminder` | grouped `reminders` |
| page key `process` | `process` |

Unknown types return no section, log only the safe page key/type, and never
throw. Draft and archived rows are omitted. Ordering uses `sort_order`, then a
stable key tie-breaker so reloads are deterministic.

## Complete section inventory

`hero`, `featured-properties`, `property-search`, `latest-properties`,
`knowledge-preview`, `philosophy`, `buying-advice`, `common-problems`,
`services`, `calculator-tools`, `commitment`, `process`, `tax`, `loan`,
`mortgage-calculator`, `reminders`, `team`, `contact`, `service-form`.

The original anchor IDs remain: `featured-properties`, `property-search`,
`latest-properties`, `knowledge-preview`, `philosophy`, `services`,
`calculators`, `process`, `calculator`, `reminders`, `team`, `consult`, and
`service-form`.

## Schema decision

No migration is required. Existing `site_pages.status`, `archived_at`,
`sort_order`, `page_type` and `page_key`, plus `home_campaigns.sort_order`, are
sufficient for Phase 1. Hidden behavior maps to draft/archived status. A future
dedicated homepage-section table is optional, not assumed by this release.

## Tests

Automated coverage includes known mapping, unknown safe fallback,
draft/archived omission, numeric ordering, deterministic ties, preserved
anchors, single header/footer source, and absence of the former full-page
fetch/regex renderer path.
