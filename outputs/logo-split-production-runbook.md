# Production Logo Split Manual Runbook

Status: `READY_FOR_MANUAL_PRODUCTION_MIGRATION`

Codex has not executed this SQL. Run only in an approved Production SQL Editor change window.

## Backup (read-only)

```sql
select id, logo_url, brand_logo_url, franchise_logo_url,
       brand_name, brand_tagline, company_name, franchise_name
from public.company_settings
where id = 'default';
```

Store the result securely; do not paste sensitive values into reports.

## Migration

```sql
alter table public.company_settings
  add column if not exists brand_logo_url text,
  add column if not exists franchise_logo_url text;

update public.company_settings
set brand_logo_url = coalesce(nullif(trim(brand_logo_url), ''), '/assets/logo-yongmei-transparent.png'),
    franchise_logo_url = coalesce(nullif(trim(franchise_logo_url), ''), nullif(trim(logo_url), ''))
where id = 'default';

alter table public.company_settings
  alter column brand_logo_url set default '/assets/logo-yongmei-transparent.png';

notify pgrst, 'reload schema';
```

This is additive and idempotent. It never clears `logo_url` or overwrites non-empty new fields.

## Verification

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'company_settings'
  and column_name in ('logo_url', 'brand_logo_url', 'franchise_logo_url');

select
  nullif(trim(brand_logo_url), '') is not null as brand_present,
  nullif(trim(franchise_logo_url), '') is not null as franchise_present,
  brand_logo_url is distinct from franchise_logo_url as values_distinct,
  logo_url is not null as legacy_preserved
from public.company_settings
where id = 'default';
```

## Ledger check

```sql
select version
from supabase_migrations.schema_migrations
where version = '202607270101';
```

If absent, stop. Do not manually insert the ledger row or repair it without a separately approved isolated CLI procedure.

## Restore plan (not to execute unless approved)

Using the securely saved pre-change values, restore only the new columns:

```sql
update public.company_settings
set brand_logo_url = :previous_brand_logo_url,
    franchise_logo_url = :previous_franchise_logo_url
where id = 'default';
```
