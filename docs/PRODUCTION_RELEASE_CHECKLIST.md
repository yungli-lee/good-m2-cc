# Production Release Checklist

目的：建立正式 Production Release Gate，作為 staging 通過後，merge main / production deploy 前的標準檢查清單。

## 1. Release Preconditions

- staging smoke test 全部通過
- staging branch working tree clean
- main branch 不可直接開發
- release notes 已整理
- production backup 已完成
- 不得帶 debug log 進 main

## 2. Git Checks

- `git status` clean
- staging 已 push
- staging 已通過驗證
- main 只接受已驗證的 staging merge
- 不得帶 staging secret 進 main
- 不得把 service role key 寫入 Git
- 不得把 `.env`、`supabase/.temp/` commit

## 3. Production Supabase Checks

確認 production：

- Project：`good-m2-core-platform`
- Project Ref：`rlbuadkmylulieoryzal`

要求：

- production migration 前必須 backup
- migration 順序明確
- 不可直接 Table Editor 手改 schema
- 不可手動改 enum / trigger / RLS，必須走 migration
- `schema_migrations` 必須和 release 版本一致

## 4. Production Environment

Cloudflare production env 必須指向 production Supabase：

- `NEXT_PUBLIC_SUPABASE_URL` = production Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = production key
- `SUPABASE_SERVICE_ROLE_KEY` = production secret
- 不可使用 staging key
- 不可使用 staging URL
- secrets 修改後必須 redeploy

## 5. Security Checks

確認：

- RLS enabled
- Service role 不得進 client
- secrets 不得進 Git
- Turnstile enabled
- Rate limit enabled
- Honeypot enabled
- Security headers 檢查
- Audit logs enabled
- Audit logs immutable trigger enabled
- public table grant 不得過度開放

## 6. Production Migration

流程：

1. production backup
2. 套 migration
3. 確認 `schema_migrations`
4. 確認 functions
5. 確認 triggers
6. 確認 grants
7. 確認 RLS
8. 確認 `profiles` / `audit_logs` table privilege

## 7. Deployment

- merge staging -> main
- push main
- Cloudflare production build success
- 若 build fail，不得手動繞過
- 只允許 rollback 或修正後重 deploy

## 8. Production Smoke Test

測試：

- login / logout
- `/admin`
- `/admin/users`
- `/admin/audit`
- `/admin/properties`
- `/admin/inquiries`
- public homepage
- public property pages
- public calculators
- public contact form
- Add User
- Role Change
- Disable / Restore
- Audit Log

## 9. Rollback

需包含：

- Cloudflare rollback deployment
- git revert 流程
- DB migration rollback 原則
- enum value 不建議硬刪
- audit log 不可刪
- immutable audit log 不可關閉，除非 emergency
- emergency procedure 必須記錄原因與時間

## 10. Go / No-Go

Go 條件：

- staging 全過
- production backup 完成
- migration 完成
- production smoke test 全過
- audit 正常
- Cloudflare logs 無重大錯誤

No-Go 條件：

- production env 指錯 Supabase
- migration 未套
- users / audit 讀取失敗
- auth login 異常
- service role 遺漏
- RLS / grant 不明確
- Cloudflare logs 有 5xx / 1102 / permission denied
- 發現 debug log 還在 production build
