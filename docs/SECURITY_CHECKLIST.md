# Security Checklist

本文件是安全缺口的主要追蹤處。架構請看 [ARCHITECTURE.md](ARCHITECTURE.md)；上線判斷請看 [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md)。

## Already Implemented

- Supabase Auth 用於後台登入。
- 後台 route 與 admin API 已建立登入與角色檢查方向。
- Supabase migration 已啟用核心資料表 RLS。
- Public properties 原則上只讀取 published 且未刪除資料。
- Storage bucket `property-media` 限圖片類型與 5MB 規格。
- Honeypot 欄位流程已出現在 public inquiries API。
- Blocklist 資料表已建立，public inquiries API 有檢查流程。
- Audit log 資料表與 helper 已建立，部分物件與媒體操作有寫入。
- `next.config.ts` 已設定部分安全 header：`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`。

## Partially Implemented

- Turnstile Production：API 有驗證入口，但 production secret 與端到端行為需重新驗收。
- Rate Limit：`rate_limit_events` 表存在，但公開表單的完整限制流程需補齊。
- Blocklist：server-side 檢查存在，但後台管理介面未完成。
- Audit Log：資料寫入存在，但 `/admin/audit-logs` 未完成。
- Forms：`/api/public/inquiries` 存在，但首頁既有表單送出路徑需完成統一。
- CSP：尚未完整 production 化。
- HSTS：尚未完整 production 化。
- 404：Next 預設可處理，但自訂品牌 404 尚未建立。

## Not Yet

- Image Metadata Strip。
- Image Compression。
- MP4 安全上傳與掃描策略。
- Sitemap。
- `robots.txt`。
- `/admin/blocklist`。
- `/admin/audit-logs`。
- 完整 backup restore drill。
- 完整 incident response runbook 驗證。

## Production MUST

上線前必須完成：

- CSP production policy。
- HSTS production policy。
- Turnstile production key/secret 端到端驗證。
- Server-side rate limit。
- Honeypot 與 blocklist production 驗證。
- 首頁與所有公開表單統一送到安全 API。
- RLS policy 實測。
- Storage bucket policy 實測。
- Service role key 不出現在 client bundle、Wrangler public vars 或 repo。
- 表單通知信防 header injection。
- 錯誤訊息不暴露 secret。
- Backup strategy 與 rollback SOP。
- Sitemap、robots.txt、404。

