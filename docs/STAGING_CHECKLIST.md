# Staging Checklist

目的：建立正式 Staging 驗收流程，作為每次 Preview / Staging Release 的標準檢查清單。

若任一項失敗，結論必須明確寫：

`Do NOT merge into main.`

## 1. Cloudflare Preview Environment

確認 Preview Deployment 使用 `good-m2-staging`。

必檢：

- Project：`good-m2-staging`
- Project Ref：`niorteztdbuyusemsgwa`
- `NEXT_PUBLIC_SUPABASE_URL` 必須指向 staging
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 必須為 staging key
- `SUPABASE_SERVICE_ROLE_KEY` 必須為 staging secret
- Secret 名稱必須完全是 `SUPABASE_SERVICE_ROLE_KEY`
- 不可誤建成 `Name SUPABASE_SERVICE_ROLE_KEY`
- 不可指向 production Supabase
- 修改 variables / secrets 後必須 Retry deployment / Redeploy

## 2. Migration

檢查：

- `npx supabase migration list`
- `npx supabase db push`
- Remote / Local 必須一致
- 不得有 pending migration
- 必須看到 `Finished supabase db push.`

## 3. Database Schema

確認重要欄位與物件存在。

`profiles`：

- `display_name`
- `last_login_at`
- `last_login_device`

`audit_logs`：

- `actor_role`
- `result`
- `metadata`
- `device`
- `request_id`

Functions / RPC：

- `current_admin_role()`
- `is_admin_role(text[])`
- `write_audit_log(...)`
- `handle_new_auth_user()`

Triggers：

- `on_auth_user_created_create_profile`
- `profiles_enforce_role_rules`
- `audit_logs_prevent_update`
- `audit_logs_prevent_delete`

## 4. Table Privileges

必檢：

- `GRANT SELECT ON public.profiles TO authenticated`
- `GRANT SELECT ON public.audit_logs TO authenticated`

不得授權以下權限給 `authenticated`，除非另有明確設計：

- `INSERT`
- `UPDATE`
- `DELETE`

## 5. RLS

確認：

- `profiles` RLS 已啟用
- `audit_logs` RLS 已啟用
- `audit_logs` 只有 owner 可讀
- table grant 不可繞過 RLS
- user-session client 查詢要同時通過 table privilege + RLS

## 6. Bootstrap User

確認至少存在：

`owner-staging@m2.cc`

並確認：

- `auth.users.id = profiles.id`
- `profiles.email = owner-staging@m2.cc`
- `profiles.role = owner`
- `profiles.deleted_at IS NULL`

## 7. Login Flow

測試：

- owner -> `/admin`
- admin -> `/admin`
- editor -> `/admin`
- viewer -> `/admin/pending`
- disabled account -> forbidden
- wrong password -> `login_failed`
- logout -> session cleared
- logout 後重新 login -> 正常

## 8. Admin Pages

逐一確認：

- Dashboard
- Properties
- Users
- Audit
- Inquiries
- Admin tools

不得出現：

- 讀取失敗
- `permission denied`
- `42501`
- `relation does not exist`
- `column does not exist`
- PostgREST schema cache error

## 9. Add User

測試：

- owner 可新增 viewer / editor / admin
- admin 只能新增 viewer / editor
- 不可新增 owner
- 新增 user 後 `auth.users` 有資料
- `public.profiles` 自動建立 viewer
- user list 可看到新使用者
- `SUPABASE_SERVICE_ROLE_KEY` 必須可由 runtime 讀到
- 若 `hasServiceRoleKey` false，檢查 Cloudflare Secret 名稱與 Redeploy

## 10. Audit Log

確認以下 action 有紀錄：

- `login_success`
- `user_created`
- `role_changed`
- `user_disabled`
- `user_restored`
- `admin_logout`

Audit Center 應可正常查詢。

## 11. Cloudflare Logs

確認 Workers Logs 沒有：

- `permission denied`
- `42501`
- `relation does not exist`
- `column does not exist`
- Worker exceeded resource limits
- Error 1102
- PostgREST schema cache error

## 12. Smoke Test

完整流程：

1. owner login
2. `/admin` 正常
3. `/admin/users` 正常
4. 新增 viewer
5. viewer login -> pending
6. owner 升 viewer -> editor
7. editor login -> `/admin`
8. owner disable editor
9. disabled editor login -> forbidden
10. owner restore editor
11. `/admin/audit` 可看到紀錄
12. logout / login 正常

## 13. Merge Gate

只有全部通過才允許 merge main。

若任一項失敗，明確寫：

`Do NOT merge into main.`
