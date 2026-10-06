# Production read-only SQL checks

The latest catalog evidence resolves the former table, column, constraint,
index, function, trigger, policy, grant, RLS, and backfill questions. Only the
four enum labels and migration ledger ordering need pre/post verification.

Run each block separately. These statements are read-only, contain no personal
data, and do not inspect secrets.

## 1. Enum pre-check

Expected before reconciliation: four rows, all with `is_present = false`.

```sql
with expected(enumlabel) as (
  values
    ('inquiry_email_sent'),
    ('inquiry_email_failed'),
    ('email_test_sent'),
    ('email_test_failed')
)
select
  expected.enumlabel,
  exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'audit_action'
      and e.enumlabel = expected.enumlabel
  ) as is_present
from expected
order by expected.enumlabel;
```

## 2. Enum post-check

Expected after staging reconciliation: `present_count = 4`,
`distinct_present_count = 4`, and `missing_labels` is empty.

```sql
with expected(enumlabel) as (
  values
    ('inquiry_email_sent'),
    ('inquiry_email_failed'),
    ('email_test_sent'),
    ('email_test_failed')
),
present as (
  select e.enumlabel
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  join expected x on x.enumlabel = e.enumlabel
  where n.nspname = 'public'
    and t.typname = 'audit_action'
)
select
  count(*) as present_count,
  count(distinct enumlabel) as distinct_present_count,
  coalesce(
    array_agg(x.enumlabel order by x.enumlabel)
      filter (where p.enumlabel is null),
    '{}'::text[]
  ) as missing_labels
from expected x
left join present p on p.enumlabel = x.enumlabel;
```

## 3. Migration ledger pre-check

Use the actual Supabase ledger table available in the target environment. This
common layout is read-only. Expected before normalization: no returned rows for
the eleven versions.

```sql
select version
from supabase_migrations.schema_migrations
where version in (
  '202607010101',
  '202607010102',
  '202607020101',
  '202607020102',
  '202607040101',
  '202607060101',
  '202607060201',
  '202607060202',
  '202607070101',
  '202607170201',
  '202607190101'
)
order by version;
```

## 4. Migration ledger post-check

Run only after the authorized staging ledger rehearsal. The result must contain
all eleven expected versions exactly once. `202607070101` is not eligible until
the enum post-check passes.

```sql
with expected(version) as (
  values
    ('202607010101'),
    ('202607010102'),
    ('202607020101'),
    ('202607020102'),
    ('202607040101'),
    ('202607060101'),
    ('202607060201'),
    ('202607060202'),
    ('202607070101'),
    ('202607170201'),
    ('202607190101')
),
actual as (
  select version
  from supabase_migrations.schema_migrations
  where version in (select version from expected)
)
select
  count(*) as recorded_count,
  count(distinct version) as distinct_recorded_count,
  coalesce(
    array_agg(e.version order by e.version)
      filter (where a.version is null),
    '{}'::text[]
  ) as missing_versions
from expected e
left join actual a on a.version = e.version;
```

These queries do not authorize ledger repair or any Production write.
