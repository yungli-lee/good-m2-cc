# CMS Company Identity Split

## Root cause

`company_settings.company_name` was previously used for both the Header brand and legal company information. The company settings form also exposed only one company-name field, so changing the legal name changed the site brand.

## Mapping

| Concern | Before | After |
|---|---|---|
| Header / Mobile main title | `company_name` | `brand_name` |
| Header / Mobile subtitle | `franchise_name` | `franchise_name` |
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

## Staging

- Linked project: `niorteztdbuyusemsgwa`
- Production project: `rlbuadkmylulieoryzal` (not connected or modified)
- Migration execution: completed against Staging only.
- No migration repair, db push, migration up, Production SQL, or deployment to Production.

## Cases A–C

The code and mapping tests cover all three independent fields and revalidation paths. Manual Preview mutation cases remain for the signed-in operator to run, because this environment does not have the operator's authenticated admin session. No test values were written by this run.

## Revalidation

Company settings save now revalidates `/`, `/contact`, `/properties`, `/sitemap.xml`, and the `company-settings` tag.

## Verification

- Typecheck: PASS
- Lint: PASS
- Company identity mapping test: PASS
- Navigation regression: PASS
- CMS Phase 1 regression: PASS
- Property regression: PASS
- Knowledge / parser / timeline regressions: PASS
- Production build: PASS
