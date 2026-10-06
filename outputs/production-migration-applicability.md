# Production Migration Applicability

Production ref: rlbuadkmylulieoryzal. No migration was executed.

| Migration | Decision | Evidence |
|---|---|---|
| 202607240101_site_navigation_items.sql | SAFE_TO_APPLY | site_navigation_items is missing; is_admin_role and set_updated_at are present. Additive table, RLS, policies, grants, indexes and trigger. |
| 202607240102_navigation_home_seed.sql | SAFE_TO_APPLY_AFTER_202607240101 | Uses (item_key, location) conflict key and ON CONFLICT DO NOTHING. Fixed hrefs do not require site_pages rows. Header, Mobile and Footer seeds are complete and do not overwrite data. |
| 202607240103_company_settings_brand_name.sql | SAFE_TO_APPLY | Additive column with null/blank-only backfill; does not update company_name or other existing fields. |
| 202607240104_company_settings_brand_tagline.sql | SAFE_TO_APPLY | Additive column with null/blank-only backfill; does not update franchise_name or other existing fields. |

## Execution order

1. 202607240101
2. 202607240102
3. 202607240103
4. 202607240104
5. PostgREST schema cache reload
6. Schema, seed, policy, grant and value verification

All four ledger version queries returned no rows. No collision or ledger conflict exists. Do not run migration repair.
