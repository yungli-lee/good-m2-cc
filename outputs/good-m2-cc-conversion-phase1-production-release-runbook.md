# Conversion Analytics Phase 1 Production Release Runbook

This runbook is a manual approval checklist. No migration, rollback, merge, push, deployment, or Production test-data creation is automatic.

## Required release order

1. Run `scripts/sql/conversion-analytics-phase1-production-precheck.sql` against Production. It is SELECT-only.
2. Record the existing inquiry/event counts, session type and compatibility buckets, RLS/policies, grants, helper functions, ID types, and migration ledger result.
3. Stop for human approval. Any invalid non-empty session value, missing dependency, unexpected schema drift, or already-recorded migration is a release blocker pending review.
   The inquiry compatibility gate must also show `attribution_status` as `text not null default 'missing'`, zero NULL values, and the existing inquiry role-enforcement trigger still enabled.
4. After explicit approval, a human operator runs `supabase/migrations/202608060101_conversion_analytics_phase1.sql` against Production.
5. Immediately run `scripts/sql/conversion-analytics-phase1-production-verify.sql`. It is SELECT-only. Compare the inquiry count with the precheck baseline.
6. Only after verification passes, merge the reviewed feature commit into `main`, then obtain push approval.
7. Push `main`, wait for Cloudflare Production deployment, and confirm its deployed commit equals `main` HEAD.
8. Smoke-test the public site without manufacturing Production analytics or inquiry rows.
9. Confirm new `analytics_events` rows are genuine Production traffic and carry `environment = 'production'`; confirm Preview events remain isolated.
10. Observe Cloudflare for Worker 1102, unexpected 404, and 500 responses.

The application must not be deployed before the database migration and verification.

## Inquiry trigger compatibility

The Phase 1 migration is deliberately DDL-only for `public.inquiries`. It must not update existing inquiry rows, alter or disable triggers, set `session_replication_role`, or manufacture authentication claims. On a fresh schema, `attribution_status` is added as `text not null default 'missing'`. On a partial or previously migrated schema, the migration only accepts an existing column when its type, default, NULL count, and NOT NULL flag already match that contract.

If the existing column contains NULL values or has a different type/default/nullability, the transaction raises an exception and rolls back. Resolve that discrepancy through a separately reviewed migration; do not modify rows or bypass `enforce_inquiry_role_rules` as part of this release.

Production verification must confirm the precheck inquiry count is unchanged, every pre-existing inquiry remains `missing`, and the role-enforcement trigger definition and enabled state are unchanged.

## Stop before migration

If the migration has not been run, stop the release. Do not merge or deploy the application. Resolve the precheck discrepancy and repeat the read-only precheck. No rollback is needed because Production was not changed.

## Migration complete, application not deployed

Keep the feature unmerged and do not deploy. Run the read-only verification and preserve its output. If verification passes, the safest path is normally roll-forward by completing the approved release. If verification fails, stop for a schema/data-retention review; do not automatically execute the destructive rollback SQL.

## Application deployed

First roll back the application through an explicitly approved Git revert/deployment of the last known-good application commit. Do not force-push or rewrite `main`. Keep the Phase 1 schema in place while impact and event volume are assessed; the additive schema is compatible with the previous application.

## Database rollback limitations

`scripts/sql/conversion-analytics-phase1-rollback.sql` is Preview-oriented and destructive. It must never be run automatically in Production.

- Converting `analytics_events.session_id` from UUID back to text is type-safe for stored UUID values, but changes the column contract and indexes expected by the Phase 1 application.
- Once Phase 1 events or `lead_attributions` exist, destructive rollback can remove attribution history or break inquiry/event relationships. Use a reviewed roll-forward migration instead.
- The rollback script intentionally refuses to proceed when Phase 1 event names exist. A separate review must also prove that `lead_attributions` is empty before any destructive Production rollback is even considered.
- Every rollback step requires human approval, a fresh backup/retention assessment, captured precheck evidence, an application rollback plan, and a post-action verification plan.

## Approval gates

- Precheck approval: database owner confirms compatibility and baseline counts.
- Migration approval: operator confirms the exact migration file checksum/commit.
- Verification approval: database owner confirms schema, security, ledger, and preserved inquiry count.
- Merge approval: code owner confirms the verified feature HEAD and conflict-free merge plan.
- Push/deploy approval: release owner confirms Cloudflare target and rollback commit.
- Acceptance approval: product owner confirms smoke results and environment isolation.
