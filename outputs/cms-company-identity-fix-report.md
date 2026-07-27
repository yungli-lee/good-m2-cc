# CMS Company Identity Split

## Root cause

`company_settings.company_name` was previously used for both the Header brand and legal company information. The company settings form also exposed only one company-name field, so changing the legal name changed the site brand.

## Mapping

| Concern | Before | After |
|---|---|---|
| Header / Mobile main title | `company_name` | `brand_name` |
| Header / Mobile subtitle | `franchise_name` | `brand_tagline` |
| Header / Mobile franchise disclosure | mixed or omitted | `franchise_name` |
| Footer brand | `company_name` | `brand_name` |
| Footer legal disclosure | mixed | `company_name` |
| Contact company card | `company_name` | `company_name` |
| Contact company card franchise | `franchise_name` | `franchise_name` |
| SEO site name | hardcoded or shared legal name | `brand_name` |
| Admin form | 公司名稱 | 品牌名稱、公司法定名稱、加盟店名稱 |

## Schema

Added `brand_name` with an additive idempotent migration:

`supabase/migrations/202607240103_company_settings_brand_name.sql`

The existing `company_name` column remains the legal company name. Existing non-empty values are not overwritten; only a missing brand value is backfilled.

Added `brand_tagline` with `202607240104_company_settings_brand_tagline.sql`; its Staging default is `彰化房地產資訊與服務` and it is independent from `franchise_name`.

## Staging

- Linked project: `niorteztdbuyusemsgwa`
- Production project: `rlbuadkmylulieoryzal` (not connected or modified)
- Migration execution: `202607240103` and `202607240104` completed against Staging only after fixing the CLI telemetry permission failure.
- Both migrations include `notify pgrst, 'reload schema'`.
- Read-only catalog evidence: `brand_name`, `brand_tagline`, `company_name`, and `franchise_name` are all `text not null` columns.
- Read-only row evidence: default row values are `阿勇不動產顧問`, `彰化房地產資訊與服務`, `赫成開發有限公司`, and `太平洋房屋彰化縣府加盟店` respectively.
- Staging migration ledger still has these two versions as local-only; no ledger repair was performed because the broader staging ledger drift remains an existing separate issue.
- Preview public pages `/`, `/contact`, `/properties`, `/calculator`, and `/knowledge` returned HTTP 200 after deployment; `/contact` metadata site name is the brand value.
- No migration repair, db push, migration up, Production SQL, or deployment to Production.

## Cases A–D

The code and mapping tests cover all four independent fields and revalidation paths. Manual Preview mutation cases remain for the signed-in operator to run, because this environment does not have the operator's authenticated admin session. No test values were written by this run.

## Revalidation

Company settings save now revalidates `/`, `/contact`, `/properties`, `/calculator`, `/knowledge`, `/sitemap.xml`, and the `company-settings` tag.

## Verification

- Typecheck: PASS
- Lint: PASS
- Company identity mapping test: PASS
- Navigation regression: PASS
- CMS Phase 1 regression: PASS
- Property regression: PASS
- Knowledge / parser / timeline regressions: PASS
- Production build: PASS
