# Production migration reconciliation

Branch: `fix/production-migration-reconciliation`  
Baseline: `256847e9b4e9cacc27d6d038440096d647546fe4`  
Production state: `PARTIAL_UNRECORDED_APPLICATION_REDUCED_TO_ENUM_GAP`  
Database action performed: none

## Decision

**READY_FOR_STAGING_TEST**

Latest Production catalog evidence confirms that ten local-only migrations are
fully applied but absent from the migration ledger. The only missing migration
effects are four `public.audit_action` labels from
`202607070101_email_diagnostics_audit_actions`.

## Effect reconciliation matrix

| Migration | Production effect state | Missing effect | Required schema action |
|---|---|---|---|
| `202607010101_property_expired_status` | `FULLY_APPLIED_NOT_IN_LEDGER` | none | none |
| `202607010102_property_auto_expire_job` | `FULLY_APPLIED_NOT_IN_LEDGER` | none | none |
| `202607020101_people_foundation` | `FULLY_APPLIED_NOT_IN_LEDGER` | none | none |
| `202607020102_people_display_legal_name` | `FULLY_APPLIED_NOT_IN_LEDGER` | none | none |
| `202607040101_people_scoped_access` | `FULLY_APPLIED_NOT_IN_LEDGER` | none | none |
| `202607060101_content_image_fit` | `FULLY_APPLIED_NOT_IN_LEDGER` | none | none |
| `202607060201_home_cms_v1` | `FULLY_APPLIED_NOT_IN_LEDGER` | none | none |
| `202607060202_home_cms_page_key_extensible` | `FULLY_APPLIED_NOT_IN_LEDGER` | none | none |
| `202607170201_site_pages_eyebrow` | `FULLY_APPLIED_NOT_IN_LEDGER` | none | none |
| `202607190101_site_pages_multi_reminders` | `FULLY_APPLIED_NOT_IN_LEDGER` | none | none |
| `202607070101_email_diagnostics_audit_actions` | `PARTIALLY_APPLIED` | four enum labels | additive enum reconciliation |

## Confirmed missing effects

| Object type | Object | Classification |
|---|---|---|
| enum label | `audit_action.inquiry_email_sent` | `MISSING_CONFIRMED` |
| enum label | `audit_action.inquiry_email_failed` | `MISSING_CONFIRMED` |
| enum label | `audit_action.email_test_sent` | `MISSING_CONFIRMED` |
| enum label | `audit_action.email_test_failed` | `MISSING_CONFIRMED` |

All tables, columns, constraints, indexes, functions, triggers, RLS settings,
policies, grants, and backfills expected by the other ten migrations are
`PRESENT_CONFIRMED`. They are deliberately absent from the reconciliation
draft so it cannot rewrite an already-correct Production definition.

## Migration ledger normalization plan

### A. Ten complete but unrecorded migrations

After staging rehearsal and a final read-only ledger snapshot, normalize the
ledger for the ten `FULLY_APPLIED_NOT_IN_LEDGER` versions listed above. This is
a ledger-only operation: do not replay their SQL and do not run `db push` or
`migration up`.

Treat the ten versions as an explicit allowlist. Confirm the remote ledger
contains none of them immediately before normalization, record the before/after
ledger output, and stop if any state differs from this report.

### B. Additive reconciliation for `202607070101`

Create a new, timestamped formal migration from the reviewed draft only after
the staging test passes. It must add exactly the four missing enum labels with
`ADD VALUE IF NOT EXISTS`. It must not recreate or alter any other object.

The draft under `supabase/migrations/drafts/` is intentionally outside the
formal migration sequence and must not be executed against Production during
this phase.

### C. Ledger timing for `202607070101`

Do not mark `202607070101` applied before the four labels are added and verified.
After the additive reconciliation succeeds, use a read-only catalog query to
confirm all four labels, then normalize the `202607070101` ledger entry. If any
label remains missing, leave this version unrecorded and stop.

## Proposed staging execution order

1. Provision or select an isolated staging database with the verified
   Production schema state and a separately recorded migration ledger.
2. Capture the read-only enum and ledger baseline.
3. Apply the four-label draft logic in staging through a newly timestamped test
   migration; do not move the draft blindly into the formal sequence.
4. Run the post-check and require exactly four requested labels, each appearing
   once.
5. Exercise audit writes that use each new label and confirm existing audit
   actions still work.
6. Re-run application typecheck, lint, production build, and relevant audit
   integration tests against staging.
7. Rehearse ledger normalization for the ten complete versions using the exact
   allowlist; verify no schema SQL is replayed.
8. Only after step 4 succeeds, rehearse marking `202607070101` applied.
9. Capture before/after schema and ledger evidence and obtain approval before
   planning any Production action.

No staging or Production operation was executed in this phase.

## Local verification

| Check | Result |
|---|---|
| Branch and baseline | PASS |
| Typecheck | PASS |
| Lint | PASS |
| Production build | PASS |
| Draft isolation | PASS — draft remains under `supabase/migrations/drafts/` |
| SQL static review | PASS — exactly four additive enum statements |
| Existing migrations changed | NO |
| Production SQL / repair / push / up / deployment / merge | NOT RUN |

## Final status

**READY_FOR_STAGING_TEST**
