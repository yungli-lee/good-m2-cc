# Production ledger normalization plan

Status: planning only. No Production action is authorized or performed.

## A. Fully applied but unrecorded migrations

| Order | Version | Name | Evidence | Repair as applied |
|---:|---|---|---|---|
| 1 | `202607010101` | `property_expired_status` | Production catalog: effects complete | Eligible after staging rehearsal |
| 2 | `202607010102` | `property_auto_expire_job` | Production catalog: effects complete | Eligible after staging rehearsal |
| 3 | `202607020101` | `people_foundation` | Production catalog: effects complete | Eligible after staging rehearsal |
| 4 | `202607020102` | `people_display_legal_name` | Production catalog: effects complete | Eligible after staging rehearsal |
| 5 | `202607040101` | `people_scoped_access` | Production catalog: effects complete | Eligible after staging rehearsal |
| 6 | `202607060101` | `content_image_fit` | Production catalog: effects complete | Eligible after staging rehearsal |
| 7 | `202607060201` | `home_cms_v1` | Production catalog: effects complete | Eligible after staging rehearsal |
| 8 | `202607060202` | `home_cms_page_key_extensible` | Production catalog: effects complete | Eligible after staging rehearsal |
| 9 | `202607170201` | `site_pages_eyebrow` | Production catalog: effects complete | Eligible after staging rehearsal |
| 10 | `202607190101` | `site_pages_multi_reminders` | Production catalog: effects complete | Eligible after staging rehearsal |

Proposed order is chronological. Before any authorized Production ledger
operation, capture a fresh ledger snapshot and revalidate this exact allowlist.
Never replay these ten migration SQL files.

Rollback/recovery: preserve the before snapshot and the exact ledger commands.
If ledger normalization records an incorrect version, stop all migration
activity and restore only the erroneous ledger metadata through a separately
reviewed, version-specific operation. Do not roll back schema objects that were
already present.

## B. `202607070101`

This version remains ineligible for an applied marker until all conditions hold:

1. a verified non-Production staging environment exists;
2. all four enum additions pass twice in staging;
3. the four audit paths pass without enum, API, or RLS errors;
4. Production later receives the approved four-label reconciliation;
5. a Production read-only post-check confirms all four labels.

## C. Reconciliation delivery choice

### Option 1 — new formal migration

Pros: auditable, repeatable across environments, source-controlled, and aligned
with normal migration ordering. Risk: the migration runner and legacy ledger
must be sequenced carefully so old unrecorded migrations are not replayed.

### Option 2 — manual SQL plus ledger repair

Pros: tightly scoped immediate execution. Risks: splits schema history from
source control, increases operator error, and makes later environment bootstrap
and audit harder.

**Recommendation: use a new uniquely timestamped formal migration containing
only the four enum statements.** First rehearse ledger normalization and runner
behavior in verified staging. Mark `202607070101` applied only after the new
reconciliation has succeeded and the four labels are verified.

## Updated staging evidence

- Staging identity is confirmed as `niorteztdbuyusemsgwa`, distinct from
  Production `rlbuadkmylulieoryzal`.
- The four requested enum labels were already present before the staging test.
- Both executions of the additive reconciliation completed without error.
- Each label remains unique at sort order 71–74.
- Result: `IDEMPOTENT_PASS`.
- The staging ledger remains synchronized only through `202607020102`; no ledger
  normalization was performed.

## Current functional evidence

- `STAGING_DATA_SAFETY`: `PASS`
- `EMAIL_DELIVERY`: `PASS`
- `PREVIEW / PRODUCTION DATA PATH`: `PASS`
- `PREVIEW EMAIL ADMIN LINK`: `ACCEPTED_AS_NON_BLOCKING`
- staging `inquiry_email_sent`: `PASS`
- staging `inquiry_email_failed`: existing audit evidence confirmed; no new
  unsafe injection
- staging `email_test_sent`: not yet verified
- staging `email_test_failed`:
  `NOT_EXECUTED_NO_SAFE_FAILURE_INJECTION`

## Current blocker

There is no CMS Phase 1 blocker. The missing `email_test_sent` verification,
safe `email_test_failed` injection, and exact Cloudflare Preview URL are closed
as non-blocking gaps and will be handled as a separate work item.

This plan does not authorize a formal reconciliation migration, ledger repair,
or any Production action. Ledger normalization remains deferred and does not
affect CMS Phase 1 application development.

此工作另案處理，不影響 CMS Phase 1 程式開發。
