# Real-price Production rollout — 2026-11-04

User-approved scope: publish direct URL `/real-price` (not in navigation or sitemap), copy full existing verified historical transaction/land/building/parking details into isolated Production database tables, then continue production-side historical backfill while showing incomplete-coverage notice.

## Completed
- Created Production-only `moi_real_price_transactions`, `moi_transaction_details`, `moi_preview_transactions`, `moi_production_transfer_batches`, and `moi_publication_state` objects, with RLS and no anon/authenticated data grants. Existing business/CRM tables were not modified.
- Validated idempotent migration RPC and transfer of one sample and a subsequent 230 source master rows, including 12 total detail rows. These are a **pilot only**, not the full staging snapshot.
- Production publication gate is **disabled** until transfer count reconciliation completes. Finalizer also requires >=100,000 masters and >=200,000 details before setting `enabled=true`.
- PR [#77](https://github.com/yungli-lee/good-m2-cc/pull/77), hidden page and supporting API/routes, merged into `main` at `964d8a75085b6003c7cf022c351f35db35bf6979`. CI typecheck passed: run 41786798987. Nothing was added to navigation or sitemap; page has robots noindex.
- Full-copy workflow `.github/workflows/moi-one-time-production-transfer.yml` is **manual trigger only** and pinned to audited script commit `9381d76492ac715973ce312e4c9339be46e68302`.

## Blocking credential and next action
- GitHub Actions run [41786136931](https://github.com/yungli-lee/good-m2-cc/actions/runs/41786136931) failed safely before copying because repository secret `MOI_PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` was absent. The existing `MOI_STAGING_SUPABASE_SERVICE_ROLE_KEY` is configured and validated.
- Project administrator must create `MOI_PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` in GitHub repository **Settings > Secrets and variables > Actions**. The value must be the Production Supabase secret API key; never post it in chat or commit it in source.
- Once added, execute **Actions > MOI one-time isolated staging-to-production transfer > Run workflow**.
- Require workflow success, full master/detail reconciliation, publication gate enabled, and deployed Pages URL independently verified before announcing usable public direct-URL search. Production Cloudflare deployment was not confirmed by direct HTTP check in the current environment.

## Source snapshot at preparation
- Staging master rows: 107,684, details: 298,650 (Changhua sale/presale only).
- Production pilot: 231 masters, 12 details; gate OFF. All numbers are subject to re-verification before full transfer.
- Future current-data updater presently still targets Staging. It must be rerouted to Production after full snapshot and future backfill paths are individually verified; do not switch automatically during migration.
- Official historical coverage remains incomplete; retain the page warning and verify source completeness by quarter before adding navigation.

Safety: no direct query to unrelated Production tables; never enable anonymous table access or ship production API credentials to the browser.
