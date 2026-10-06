# Production Schema Gap Report (Final)

Production project: rlbuadkmylulieoryzal

## Read-only evidence

| Object | Status |
|---|---|
| public.site_pages | PRESENT |
| public.company_settings | PRESENT |
| public.media_assets | PRESENT |
| public.audit_logs | PRESENT |
| public.site_navigation_items | MISSING |

Required site_pages fields page_key, page_type, status, archived_at, published_at, seo_title, seo_description, cover_media_id and fallback_cover_url are PRESENT.

company_settings: brand_name MISSING; brand_tagline MISSING; company_name PRESENT; franchise_name PRESENT.

Dependencies: public.is_admin_role(roles text[]) PRESENT; public.set_updated_at() PRESENT.

## Migration ledger

Read-only queries for 202607240101, 202607240102, 202607240103 and 202607240104 returned no rows. There is no timestamp collision and no ledger conflict. Missing objects are covered by the four additive migrations. Production has not been modified.
