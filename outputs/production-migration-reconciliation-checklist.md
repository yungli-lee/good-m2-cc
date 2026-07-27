# Production reconciliation checklist

## Production evidence

- [x] Ten local-only migrations are `FULLY_APPLIED_NOT_IN_LEDGER`.
- [x] `202607070101_email_diagnostics_audit_actions` is `PARTIALLY_APPLIED`.
- [x] `inquiry_create` is already present.
- [x] `inquiry_email_sent` is confirmed missing.
- [x] `inquiry_email_failed` is confirmed missing.
- [x] `email_test_sent` is confirmed missing.
- [x] `email_test_failed` is confirmed missing.
- [x] No other table, column, constraint, index, function, trigger, policy,
  grant, RLS, or backfill repair is required.

## Draft scope

- [x] Draft remains in `supabase/migrations/drafts/`.
- [x] Draft contains exactly four `ADD VALUE IF NOT EXISTS` statements.
- [x] Draft contains no table, column, constraint, index, function, trigger,
  policy, grant, RLS, backfill, or destructive statement.
- [x] Existing migration files remain unchanged.

## Staging gate

- [ ] Staging is isolated from Production.
- [ ] Read-only pre-check captures enum and ledger state.
- [ ] A new timestamped staging migration is created from the reviewed draft.
- [ ] All four enum labels are present exactly once after application.
- [ ] Audit writes using each label pass.
- [ ] Existing audit actions regress successfully.
- [ ] Ten-version ledger normalization is rehearsed without replaying SQL.
- [ ] `202607070101` is marked applied only after its four labels are verified.
- [ ] Before/after evidence and rollback notes are retained.

## Prohibited operations in this phase

- [x] No Production SQL executed.
- [x] No migration repair executed.
- [x] No `db push` or `migration up` executed.
- [x] No Preview or Production deployment executed.
- [x] No merge executed.

Current result: **READY_FOR_STAGING_TEST**
