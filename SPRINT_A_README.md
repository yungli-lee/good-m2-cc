# Sprint A Core Platform

Scope:

- Supabase Auth admin login
- Public published properties
- Admin property CRUD
- Property image upload and cover selection
- Audit logs for property and media changes

Not included:

- Dashboard
- Analytics Dashboard：Deferred to Sprint C
- GA4 基礎載入：尚未納入 Sprint A，建議作為 Sprint B First Step

第 16 項 `/admin/analytics` Dashboard 暫緩至 Sprint C。原因：需先完成 GA4 基礎載入並累積 page_view / event 資料，再建立後台分析 dashboard。
- TikTok

## Migration

Formal migration:

```text
supabase/migrations/202606250101_sprint_a_core_platform.sql
```

Apply with Supabase CLI:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Or paste the complete SQL file into Supabase SQL Editor.

## Environment

Copy `.env.example` to `.env.local` for local development. Do not commit `.env.local`.

```bash
cp .env.example .env.local
```

Required for Sprint A:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
IP_HASH_SECRET=
```

## Local Development

```bash
pnpm install
pnpm dev
```

Validation:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Roles

| Action | editor | admin | owner |
| --- | --- | --- | --- |
| Login admin | yes | yes | yes |
| View properties | yes | yes | yes |
| Create draft property | yes | yes | yes |
| Edit draft property | yes | yes | yes |
| Upload property images | yes | yes | yes |
| Set cover image | yes | yes | yes |
| Publish property | no | yes | yes |
| Unpublish property | no | yes | yes |
| Soft delete property | no | yes | yes |
| View audit logs | no | yes | yes |

Public signups are assumed disabled in Supabase Auth. Admin users must be created intentionally and assigned a row in `public.profiles`.
