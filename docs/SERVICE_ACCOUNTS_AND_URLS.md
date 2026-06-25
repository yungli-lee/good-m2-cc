# Service Accounts and URLs

本文件整理 good.m2.cc 動態網站目前使用到的外部服務、網址、主要功能與注意事項。架構細節請看 [ARCHITECTURE.md](ARCHITECTURE.md)；安全檢查請看 [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)；上線檢查請看 [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md)。

注意：本文件不得記錄任何密碼、API key、secret、token。若 repo 無法確認實際網址或帳號，統一標示 `TBD`。

## Service Inventory

| Service | URL | Used For | Critical Settings | Owner / Login Hint | Production Risk |
| --- | --- | --- | --- | --- | --- |
| Production Site | `https://good.m2.cc` | 正式網站入口 | Cloudflare Pages custom domain、DNS、SSL | Cloudflare / domain owner | Production 目前仍需確認是否維持靜態站或切 Next.js preview 成果 |
| Cloudflare Pages Preview | `TBD` | Preview / staging 驗收 | Branch deployment for `preview/sprint-a-production-wiring` | Cloudflare Pages project owner | repo / `wrangler.toml` 未直接保存 preview URL，需從 Cloudflare Pages deployment 頁確認 |
| GitHub | `https://github.com/yungli-lee/good-m2-cc.git` | 版本控管、PR、Cloudflare 部署來源 | Branch: `preview/sprint-a-production-wiring` | GitHub owner / collaborators | 未經確認不得 push `main` 或 production branch |
| Cloudflare Pages | `TBD` | Next.js / static site deployment | Build command: `npm run pages:build`; output: `.vercel/output/static`; `nodejs_compat` | Cloudflare account | Build command、output directory、branch 設錯會造成 404 或白屏 |
| Cloudflare Functions | `TBD` | API runtime、legacy service request、Next.js server runtime | Pages Functions runtime、compatibility flags | Cloudflare account | Runtime env 與 Pages vars 需驗證；不可假設 dashboard vars 一定注入 |
| Cloudflare DNS / Custom Domain | `https://good.m2.cc` | DNS、SSL、custom domain | `good.m2.cc` custom domain records | Cloudflare / domain DNS owner | DNS 改動會影響 production 可用性 |
| Cloudflare Turnstile | `https://challenges.cloudflare.com/turnstile/v0/siteverify` | 表單防機器人驗證 | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET_KEY` | Cloudflare account | Secret 未設定時不得讓 production 悄悄跳過驗證 |
| Cloudflare Environment Variables | `TBD` | Supabase public vars、Turnstile、Resend、app settings | Production / Preview env 分開管理 | Cloudflare Pages project owner | Service role key、Resend key 不可寫入前端或公開 vars |
| Cloudflare Security Headers | `TBD` | CSP、HSTS、X-Frame-Options、Referrer-Policy | `next.config.ts`、`_headers` | Cloudflare / repo maintainer | CSP、HSTS 尚未完整 production 化 |
| Supabase Project | `https://rlbuadkmylulieoryzal.supabase.co` | Auth、PostgreSQL、Storage、RLS | Public URL and anon key configured; service role key server only | Supabase project owner | Service role key 不可外洩；anon key 可公開但必須搭配 RLS |
| Supabase Database | `https://rlbuadkmylulieoryzal.supabase.co` | `profiles`、`properties`、`property_media`、`inquiries`、`blocklist`、`rate_limit_events`、`audit_logs` | Migration: `supabase/migrations/202606250101_sprint_a_core_platform.sql` | Supabase project owner | Migration 與 RLS 未套用或套錯 project 會造成資料外洩或功能失敗 |
| Supabase Auth | `https://rlbuadkmylulieoryzal.supabase.co` | 後台登入、session、role check | Public signup disabled assumption; role from `profiles.role` | Supabase Auth admin | 第一個 owner 必須安全建立；不要開放任意註冊 |
| Supabase Storage | `https://rlbuadkmylulieoryzal.supabase.co` | 物件圖片、封面照片 | Bucket: `property-media`; images only; max 5MB | Supabase project owner | Storage policy 錯誤可能讓未授權者讀寫圖片 |
| Supabase RLS | `https://rlbuadkmylulieoryzal.supabase.co` | 前台/後台資料隔離 | RLS enabled on core tables | Supabase project owner | RLS 必須實測，不可只看 migration |
| Resend | `https://resend.com` | 表單通知信、寄件網域驗證 | `RESEND_API_KEY`、`CONTACT_FROM_EMAIL=service@m2.cc`、`CONTACT_NOTIFY_TO` | Resend account owner | DNS records、DKIM、SPF、DMARC 未正確會影響寄信與到達率 |
| Resend Sending Domain | `m2.cc` / `service@m2.cc` | 表單通知寄件身分 | Sending domain verification | Resend + DNS owner | 特別注意 DKIM/SPF/DMARC 與 DNS record 不可誤刪 |
| Squarespace Domain | `TBD` | Domain 管理、DNS Records | `m2.cc` / `good.m2.cc` DNS 代管需確認 | Squarespace account owner | DNS 改動需謹慎，特別是 `resend._domainkey` |
| Google Analytics / GA4 | `TBD` | Planned: 流量分析 | GA4 Measurement ID 尚未在 repo 確認 | Google account owner | 尚未實作；不要宣稱已有分析資料 |
| Google Search Console | `TBD` | Planned: 搜尋收錄、索引狀態 | Domain property / URL prefix 需確認 | Google account owner | sitemap、robots.txt 尚未完成會影響 SEO 驗收 |
| Gmail / Google Workspace | `TBD` | Email 收信或工作信箱 | MX records / inbox owner 需確認 | Google account owner | 若收信信箱未設定，表單通知可能無人接收 |
| Facebook Page | `https://m.facebook.com/p0938137177/` | 社群曝光、導流至 good.m2.cc | 首頁 footer link | Meta account owner | 社群連結變更需同步首頁 |
| Instagram | `TBD` | Planned: 社群曝光、導流 | 尚未在 repo 確認 URL | Meta account owner | 尚未確認，不應放入 production CTA |
| Meta Business Suite | `TBD` | Planned: 廣告、社群管理 | Pixel / ads account 尚未確認 | Meta account owner | 若未完成隱私與追蹤設定，不建議啟用廣告追蹤 |
| TikTok | `https://www.tiktok.com/@buyhouse4` | 影音內容來源、首頁 footer link | Sprint A 尚未串接自動抓最新影片 | TikTok account owner | Latest video section 未完成，不可宣稱自動同步 |
| LINE | `https://line.me/ti/p/abQv5LYzzE` | 主要 CTA、客戶聯絡入口 | 首頁 Hero、footer、floating CTA、物件詳細頁 | LINE account owner | 若連結改成官方帳號或 LIFF，所有 CTA 需同步更新 |
| YouTube | `https://youtube.com/channel/UCkHgKlrQTko0FPyAtYC9KBA?si=Dyyb72tdYhEM1IIx` | 首頁 footer link、影音入口 | 尚未串接 property media YouTube | YouTube account owner | 目前只作外部連結，不是主推物件影片功能 |
| npm / Node.js | `package.json` | Next.js、TypeScript、ESLint、Supabase client | Node observed locally: `v24.14.0`; npm observed locally: `11.9.0` | Local developer machine | Cloudflare build Node version仍需在 Pages 設定確認 |
| Next.js | `package.json` | App Router frontend/backend | `next@^15.1.0` | Repo maintainer | Cloudflare Pages output 必須正確產生 |
| TypeScript | `package.json` | Type checking | `npx tsc --noEmit` | Repo maintainer | Type errors should block deploy |
| ESLint | `package.json` | Linting | `npx eslint .` | Repo maintainer | Lint errors should block deploy |
| Wrangler / next-on-pages | `wrangler.toml` / `package.json` | Cloudflare Pages build output | `pages:build`: `npx @cloudflare/next-on-pages@1`; output `.vercel/output/static` | Repo maintainer / Cloudflare account | Wrangler CLI version not pinned in repo; build tool behavior may change |
| Local Development | `TBD` | 本機開發與驗證 | `npm install`; `npx tsc --noEmit`; `npx eslint .`; `npm run pages:build` | Local developer machine | 本機 Node 與 Cloudflare build Node 版本需一致化 |

## URLs Found in Repository

- Production site: `https://good.m2.cc`
- GitHub repo: `https://github.com/yungli-lee/good-m2-cc.git`
- Supabase project URL: `https://rlbuadkmylulieoryzal.supabase.co`
- Turnstile verify endpoint: `https://challenges.cloudflare.com/turnstile/v0/siteverify`
- Resend API endpoint: `https://api.resend.com/emails`
- LINE CTA: `https://line.me/ti/p/abQv5LYzzE`
- Facebook page: `https://m.facebook.com/p0938137177/`
- TikTok profile: `https://www.tiktok.com/@buyhouse4`
- YouTube channel: `https://youtube.com/channel/UCkHgKlrQTko0FPyAtYC9KBA?si=Dyyb72tdYhEM1IIx`

## URLs Marked TBD

- Cloudflare Pages preview deployment URL.
- Cloudflare dashboard project URL.
- Cloudflare Turnstile dashboard URL.
- Squarespace domain dashboard URL.
- Google Analytics / GA4 property URL.
- Google Search Console property URL.
- Gmail / Google Workspace admin URL.
- Instagram URL.
- Meta Business Suite URL.
- Local development public URL.

## Local Development Commands

```bash
npm install
npx tsc --noEmit
npx eslint .
npm run pages:build
```

Optional Cloudflare-related command, subject to installed CLI/version:

```bash
npx wrangler --version
```

## Source References

- `wrangler.toml`
- `package.json`
- `.env.example`
- `content/static-home.html`
- `app/(public)/properties/[slug]/page.tsx`
- `app/api/public/inquiries/route.ts`
- `functions/api/service-request.js`
- `supabase/migrations/202606250101_sprint_a_core_platform.sql`

