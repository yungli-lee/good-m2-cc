# Architecture

本文件是技術架構的主要來源。路由列表請看 [ROUTE_MAP.md](ROUTE_MAP.md)；安全缺口請看 [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)；部署與上線判斷請看 [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md)。

## System Architecture

目前 preview 分支採用 Next.js App Router 作為前後台應用主體，Cloudflare Pages 作為部署平台，Supabase 作為 Auth、PostgreSQL、Storage 與 RLS 資料層。

既有靜態首頁內容目前由 Next 首頁載入，目標是保留現有官網內容，同時逐步把後台與資料功能正式整併。

## Next.js App Router

- 首頁來源：`app/page.tsx`。
- Public route 群組：`app/(public)/properties`。
- Admin route：`app/admin`。
- API route：`app/api`。
- Middleware：`middleware.ts`。

## Supabase

Supabase 負責：

- Auth 使用者登入。
- PostgreSQL 資料表。
- RLS policy。
- Storage bucket `property-media`。

環境變數以 `.env.example` 與 `wrangler.toml` 的 public vars 作為參考。Service role key 不可放入前端或公開 client runtime。

## PostgreSQL

正式 migration 位於：

- `supabase/migrations/202606250101_sprint_a_core_platform.sql`

目前核心資料表：

- `profiles`
- `properties`
- `property_media`
- `inquiries`
- `blocklist`
- `rate_limit_events`
- `audit_logs`

## Storage

目前 bucket：

- `property-media`

目前支援圖片與封面。媒體能力缺口請看 [MEDIA_CAPABILITY_GAP.md](MEDIA_CAPABILITY_GAP.md)。

## Auth

後台登入使用 Supabase Auth。登入路由：

- `/admin/login`

登入後目前導向：

- `/admin/properties`

角色來源為 `profiles.role`，角色包含 owner、admin、editor。

## RLS

RLS 由 Supabase migration 啟用。原則：

- Public 只能讀 published 且未刪除的資料。
- Staff 才能管理後台資料。
- Admin / owner 才能管理高權限資料。

具體 policy 清單請以 migration SQL 為準。

## Public API

目前主要 public API：

- `/api/public/inquiries`
- `/api/public/featured-properties`

表單安全尚未完成 production 級驗收，請參考 [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)。

## Admin API

目前主要 admin API：

- `/api/admin/properties`
- `/api/admin/property-media`
- `/api/admin/inquiries`

Admin API 必須檢查登入與角色。

## Cloudflare Pages

Preview deployment 依賴 Cloudflare Pages 與 next-on-pages output。

目前 Pages output：

- `.vercel/output/static`

Wrangler 設定：

- `wrangler.toml`

## Wrangler

目前 `wrangler.toml` 包含：

- `name`
- `compatibility_date`
- `compatibility_flags = ["nodejs_compat"]`
- `pages_build_output_dir = ".vercel/output/static"`
- preview / production public Supabase vars
- D1 binding

請勿在 Wrangler vars 放入 service role key 或 Resend secret。

## Environment Variables

主要必要變數：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `IP_HASH_SECRET`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL`
- `CONTACT_FROM_NAME`
- `CONTACT_NOTIFY_TO`

實際清單請以 `.env.example` 為準。

## Deployment Flow

1. 在 preview branch 修改並驗證。
2. 執行 TypeScript、ESLint、build。
3. Cloudflare Pages 使用 Next output。
4. Preview/Staging 驗收。
5. Supabase migration 與 env 完成 production 驗證。
6. 才能考慮 production branch 或 production deployment 切換。

目前結論：不建議直接 production go-live，請先完成 [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) 的 MUST 項。

