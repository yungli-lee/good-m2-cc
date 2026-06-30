# DB Release Checklist

目的：release 前固定比對 staging / production DB schema、migration history、RLS、Storage policy 與 Cloudflare env，避免 production 漏套 migration 或 schema cache 未更新。

## A. Release 前必查項目

- staging migration history：確認 remote 已套到本次 release 最新 migration。
- production migration history：確認 production remote 與 staging/repo 版本一致。
- staging schema：確認本次功能需要的 table / column / enum / trigger 已存在。
- production schema：確認 production table / column / enum / trigger 與 staging 一致。
- PostgREST schema cache reload：migration 後執行 schema reload，避免 PGRST204 / schema cache stale。
- RLS policy 檢查：profiles、audit_logs、properties、property_media、property_timeline_events、company_settings。
- Storage policy 檢查：property-media、company-assets bucket 與 storage.objects policies。
- Cloudflare env / secret 指向檢查：production env 不可指向 staging Supabase。

## B. 必跑指令與 SQL

以下指令請分別對 staging 與 production 執行。若使用 Supabase CLI linked project，先明確確認 project ref。

```bash
# staging
npx supabase link --project-ref niorteztdbuyusemsgwa
npx supabase migration list --linked

# production
npx supabase link --project-ref rlbuadkmylulieoryzal
npx supabase migration list --linked
```

### 查 migration history

```sql
select version, name, inserted_at
from supabase_migrations.schema_migrations
order by version;
```

### 查 table columns

```sql
select table_schema, table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles',
    'audit_logs',
    'properties',
    'property_media',
    'property_timeline_events',
    'company_settings'
  )
order by table_name, ordinal_position;
```

### 查 RLS policies

```sql
select schemaname, tablename, policyname, cmd, roles::text as roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'audit_logs',
    'properties',
    'property_media',
    'property_timeline_events',
    'company_settings'
  )
order by tablename, policyname, cmd;
```

### 查 storage policies

```sql
select schemaname, tablename, policyname, cmd, roles::text as roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    policyname ilike '%property media%'
    or policyname ilike '%company assets%'
  )
order by policyname, cmd;
```

### 查 Storage buckets

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('property-media', 'company-assets')
order by id;
```

### 查 profiles role

```sql
select id, email, role::text, deleted_at, display_name, last_login_at
from public.profiles
where lower(email) in ('lee@m2.cc', 'wu@m2.cc', 'owner-staging@m2.cc')
order by email;
```

### 查 audit_logs 權限

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'audit_logs'
  and grantee in ('anon', 'authenticated', 'service_role')
order by grantee, privilege_type;
```

### 查 property_media 欄位

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'property_media'
  and column_name in ('media_type', 'url', 'storage_path', 'deleted_at', 'is_cover')
order by ordinal_position;
```

### 查 properties lifecycle 欄位

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'properties'
  and column_name in (
    'status',
    'published_at',
    'deleted_at',
    'deleted_by',
    'delete_reason',
    'floor_price',
    'service_fee_rate'
  )
order by ordinal_position;
```

### PostgREST schema cache reload

Migration 後必跑：

```sql
notify pgrst, 'reload schema';
```

Supabase CLI 範例：

```bash
npx supabase db query --linked "notify pgrst, 'reload schema';"
```

### Cloudflare env / secret 指向檢查

Production 必須指向 production Supabase：

- `NEXT_PUBLIC_SUPABASE_URL` = `https://rlbuadkmylulieoryzal.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = production anon / publishable key
- `SUPABASE_SERVICE_ROLE_KEY` = production service role secret

Staging 必須指向 staging Supabase：

- `NEXT_PUBLIC_SUPABASE_URL` = `https://niorteztdbuyusemsgwa.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = staging anon key
- `SUPABASE_SERVICE_ROLE_KEY` = staging service role secret

Cloudflare CLI 範例：

```bash
npx wrangler pages deployment list --project-name good-m2-cc --environment production --json
npx wrangler pages deployment list --project-name good-m2-cc --environment preview --json
```

若 CLI 無 `CLOUDFLARE_API_TOKEN`，需由 Cloudflare Dashboard 人工確認 env / secrets。

## C. 必跑功能驗收

- owner/admin users page：`/admin/users` 可列出使用者，不可出現 request_failed / 空清單誤判。
- owner/admin audit page：`/admin/audit` 可讀 audit logs，editor/viewer 不可越權。
- property image upload：後台物件照片可上傳、可寫入 `property_media`、可設封面、可刪除。
- property create/edit/publish/unpublish：新增、編輯、上架、下架原因、重新上架均正常。
- frontend property page：前台物件頁 200，且只顯示公開欄位。
- deleted property not visible on frontend：soft deleted 物件不可出現在首頁、列表、精選、detail slug。

## D. Go / No-Go

Go：

- staging / production migration history 已比對。
- staging / production schema 欄位與 policy 已比對。
- PostgREST schema cache 已 reload。
- Cloudflare env / secrets 已確認指向正確 Supabase。
- production smoke test 全過。

No-Go：

- production migration history 缺本次 release migration。
- production table column 缺漏。
- RLS / storage policy 不一致。
- `profiles` role 缺 owner/admin。
- `audit_logs` owner/admin 無法讀取。
- `property_media` 缺 `storage_path` 或 `media_type` default。
- Cloudflare production 指向 staging Supabase。
