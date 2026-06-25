# Maintenance and Backup

本文件是上線後維護與備份策略。Go-live 前請先完成 [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) 的 MUST 項；安全項目請看 [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)。

## Database Backup

- Supabase PostgreSQL 必須啟用定期備份。
- 每週至少確認一次最近備份是否可用。
- 每季至少執行一次 restore drill。
- migration 檔案必須隨 git 版本保存。

## Storage Backup

- `property-media` bucket 需要定期備份。
- 物件下架後媒體預設保留，除非由後台明確刪除。
- 刪除前應確認是否仍被公開物件或 audit record 參照。

## Environment Backup

- Production env 不得 commit。
- Supabase、Cloudflare、Resend、Turnstile 等設定應存放於安全密碼管理工具。
- 每月確認 env 仍與 `.env.example` 的必要清單一致。

## Weekly Maintenance

- 檢查詢問單是否正常進入後台。
- 檢查垃圾訊息與 blocklist 命中狀況。
- 檢查 audit log 是否有異常操作。
- 檢查備份是否成功。
- 檢查圖片是否可正常上傳與顯示。

## Monthly Maintenance

- 更新套件並在 preview 測試。
- 檢查 Supabase RLS policy。
- 檢查 Cloudflare env 與 Wrangler 設定。
- 檢查 SEO metadata、速度與主要路由。
- 檢查表單通知信。

## Quarterly Security Review

- 執行 backup restore drill。
- 檢查 CSP、HSTS、RLS、storage policy。
- 檢查 service role key 是否輪替或仍安全。
- 檢查 admin user 與 owner 權限。
- 清理過期 spam、rate limit event 與軟刪除資料。

## Inquiry Retention

- 正常詢問單：至少保留 1 年。
- Spam：建議 90 天後清理。
- 匯出 CSV 應限 admin / owner。

## Audit Log Retention

- Audit log：至少保留 1 年。
- 不記錄密碼、token、API key。
- 清理前需先確認是否有法務、稽核或交易追蹤需求。

## Incident SOP

### 表單收不到信

1. 檢查 Resend env。
2. 檢查 `/api/public/inquiries` 是否有寫入。
3. 檢查 spam / blocklist / rate limit。
4. 檢查寄信服務 dashboard。

### 圖片無法上傳

1. 檢查使用者角色。
2. 檢查 `property-media` bucket policy。
3. 檢查檔案 MIME、大小、extension。
4. 檢查 `property_media` insert error。

### 後台無法登入

1. 檢查 Supabase Auth user。
2. 檢查 `profiles` role。
3. 檢查 Cloudflare runtime env。
4. 檢查 `/admin/login` error code。

### Supabase 連線失敗

1. 檢查 public URL / anon key。
2. 檢查 service role key 是否只在 server 使用。
3. 檢查 Supabase service status。
4. 檢查 RLS 是否誤擋。

### 網站打不開

1. 檢查 Cloudflare deployment。
2. 檢查 latest commit 與 branch。
3. 檢查 build output。
4. 需要時切回 production static backup branch。

## Rollback SOP

1. 保留最後穩定靜態站 commit 與 branch。
2. Production 切換前先使用 preview/staging 驗收。
3. 若 Next.js production 失敗，Cloudflare Pages 改回穩定靜態 branch。
4. Supabase migration 若已套用，不直接破壞性回滾；先停用新功能 route 或 UI，再評估 SQL rollback。
5. Rollback 後補寫事故紀錄與修復計畫。

