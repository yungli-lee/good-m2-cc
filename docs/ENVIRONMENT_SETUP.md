# Environment Setup

本文件整理 good.m2.cc 本機、Cloudflare Preview 與 Production 的環境變數需求。服務帳號與網址請參閱 [SERVICE_ACCOUNTS_AND_URLS.md](SERVICE_ACCOUNTS_AND_URLS.md)；安全缺口請參閱 [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)；工作流程請參閱 [../PROJECT_WORKING_AGREEMENT.md](../PROJECT_WORKING_AGREEMENT.md)。

不得把 `.env.local`、service role key、API key、secret、token 或 production env commit 到 repo。

## Local Development Env

本機可使用 `.env.local` 或相容的本機 env 機制設定，但不得提交。`.gitignore` 已排除 `.env` 與 `.env.*`，並保留 `!.env.example`。

若要本機測 `/api/public/inquiries`，至少需要：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IP_HASH_SECRET`

Phase 1 尚未加入 Turnstile widget，因此本機測表單時不要設定 `TURNSTILE_SECRET_KEY`，除非同時提供有效 Turnstile token。

## Cloudflare Preview Env

Cloudflare Preview 應在 Pages Dashboard 設定環境變數，不要寫入 repo。

Preview 驗證 `/api/public/inquiries` 時至少需要：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IP_HASH_SECRET`

Phase 1 若尚未加入 Turnstile widget，Preview 不應設定 `TURNSTILE_SECRET_KEY`，否則空 token 會造成表單送出失敗。

## Production Env

Production 必須使用 Cloudflare Pages Production variables 或正式 secret 管理方式設定，不得使用 debug 或測試 secret。

Production 啟用表單前必須確認：

- Supabase RLS 已實測。
- `SUPABASE_SERVICE_ROLE_KEY` 只存在 server runtime。
- Turnstile widget 與 `TURNSTILE_SECRET_KEY` 同時完成。
- Rate limit 完成。
- Resend 新 API 通知整合完成或明確標示暫不寄信。

## `/api/public/inquiries` Required Env

`/api/public/inquiries` 目前會使用 Supabase admin client 寫入 `inquiries`，因此缺少 service role key 時會失敗。程式實際讀取的是 `NEXT_PUBLIC_SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY`。

| Variable | Local | Preview | Production | Required For | Notes |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Required | Required | Supabase URL | Public value；可公開，但仍需搭配 RLS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required for app auth/public clients | Required | Required | Supabase anon client / Auth | Public value；可公開，但仍需搭配 RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for local inquiry POST | Required for Preview inquiry POST | Required server-side only | `/api/public/inquiries` admin insert | 不可公開、不可送到前端、不可 commit |
| `IP_HASH_SECRET` | Required for stable local hash | Required | Required | IP hash for inquiries / anti-abuse | 不可 commit；未設定時程式會用 development fallback，不適合 production |
| `TURNSTILE_SECRET_KEY` | Do not set for Phase 1 unless widget exists | Do not set for Phase 1 unless widget exists | Required only after widget is live | Turnstile server verification | 設定後若首頁沒有 widget token，所有送出會失敗 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Planned | Planned | Required with widget | Turnstile frontend widget | Phase 1 尚未加入 widget |
| `RESEND_API_KEY` | Optional in Phase 1 | Optional in Phase 1 | Required after notification integration | Resend notification email | 新 API 尚未整合 Resend |
| `RESEND_FROM_EMAIL` | Planned alias | Planned alias | Planned alias | Future Resend sender | 目前 `.env.example` 使用 `CONTACT_FROM_EMAIL` |
| `RESEND_TO_EMAIL` | Planned alias | Planned alias | Planned alias | Future Resend recipient | 目前 `.env.example` 使用 `CONTACT_NOTIFY_TO` |
| `CONTACT_FROM_EMAIL` | Optional in Phase 1 | Optional in Phase 1 | Required after notification integration | Current documented sender env | `.env.example` currently uses this name |
| `CONTACT_NOTIFY_TO` | Optional in Phase 1 | Optional in Phase 1 | Required after notification integration | Current documented recipient env | `.env.example` currently uses this name |

## Turnstile Env Strategy

Phase 1 尚未加入首頁 Turnstile widget。

- 若 `TURNSTILE_SECRET_KEY` 沒有設定，API 目前會跳過 Turnstile server verification。
- 若 `TURNSTILE_SECRET_KEY` 已設定，但 request 沒有 `turnstile_token`，API 會拒絕送出。
- 因此 Preview 在 Phase 1 驗證表單時，不應設定 `TURNSTILE_SECRET_KEY`。
- 若要啟用 `TURNSTILE_SECRET_KEY`，必須同時完成首頁 Turnstile widget，並把 token 寫入 `turnstile_token` 欄位。

Production 不應長期跳過 Turnstile。Turnstile production 強制驗證仍是 go-live MUST。

## Supabase Env Strategy

Supabase env 分三層：

- Public URL / anon key：可存在前端與 Cloudflare public vars，但必須搭配 RLS。
- Service role key：只能存在 server runtime；不可出現在 browser、client bundle、repo 或公開設定。
- RLS：即使 anon key 可公開，也必須實測 public/admin 權限。

`/api/public/inquiries` 目前使用 service role 寫入 Supabase `inquiries`。這代表 Preview 與 Production 都必須設定 `SUPABASE_SERVICE_ROLE_KEY` 才能驗證成功。

## Resend Env Strategy

Phase 1 不整合 Resend。

目前狀態：

- 舊 Cloudflare Function `/api/service-request` 使用 `RESEND_API_KEY`、`NOTIFY_EMAIL_FROM`、`NOTIFY_EMAIL_TO`。
- `.env.example` 文件目前列出 `RESEND_API_KEY`、`CONTACT_FROM_EMAIL`、`CONTACT_FROM_NAME`、`CONTACT_NOTIFY_TO`。
- 新 `/api/public/inquiries` 尚未寄通知信。

後續正式整合前，需先決定標準命名。建議新 API 使用文件化名稱，並避免同時維護多組語意相同的 env。

## Do Not Commit `.env.local`

不可提交：

- `.env`
- `.env.local`
- `.env.development`
- `.dev.vars`
- 任何含 secret / key / token 的檔案

目前 `.gitignore` 已包含：

```text
.env
.env.*
!.env.example
```

## Cloudflare Preview Setup Steps

1. 到 Cloudflare Pages project。
2. 選擇 Preview environment variables。
3. 新增或確認：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `IP_HASH_SECRET`
4. Phase 1 暫時不要設定 `TURNSTILE_SECRET_KEY`，除非 Turnstile widget 已完成。
5. Retry preview deployment。
6. 測首頁服務表單送出。
7. 到 Supabase `inquiries` 確認資料寫入。
8. 到 `/admin/inquiries` 確認後台可看見。

## Current Phase 1 Gaps

- 本機目前沒有 env，因此不能驗證實際 POST。
- Preview 需要補 `SUPABASE_SERVICE_ROLE_KEY` 與 `IP_HASH_SECRET`。
- Turnstile production 強制驗證尚未完成。
- Rate limit 尚未實作。
- Resend 尚未整合新 API。

