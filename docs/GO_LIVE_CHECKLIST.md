# Go Live Checklist

本文件是 production go-live 判斷入口。安全細節請看 [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)；架構請看 [ARCHITECTURE.md](ARCHITECTURE.md)；維護策略請看 [MAINTENANCE_AND_BACKUP.md](MAINTENANCE_AND_BACKUP.md)。

結論：目前不建議正式 Production。適合 Preview / Staging 驗收。

## Frontend

| Item | Level | Status |
| --- | --- | --- |
| 首頁正常顯示 | MUST | 需 preview 驗收 |
| Hero 圖片、文案、CTA 正常 | MUST | 已完成，需手機重驗 |
| 精選物件區塊 | SHOULD | 部分完成 |
| 物件列表與詳細頁可分享 | MUST | 部分完成 |
| 服務表單 anchor 定位 | MUST | 已修正，需 preview 驗收 |
| TikTok 最新影音 | CAN DEFER | 未完成 |

## Backend

| Item | Level | Status |
| --- | --- | --- |
| `/admin/login` 可登入 | MUST | 已完成 preview 驗收 |
| 未登入不得進入後台 | MUST | 需端到端重驗 |
| 物件 CRUD | MUST | 部分完成 |
| 圖片上傳與封面 | MUST | 已完成 preview 驗收 |
| 詢問單管理 | SHOULD | 部分完成 |
| Dashboard | CAN DEFER | 未完成 |

## Database

| Item | Level | Status |
| --- | --- | --- |
| Supabase migration 已套用 | MUST | 需 production SQL 驗證 |
| 資料表存在 | MUST | migration 已提供 |
| indexes / constraints | MUST | migration 已提供 |
| updated_at trigger | SHOULD | migration 已提供 |

## RLS

| Item | Level | Status |
| --- | --- | --- |
| properties RLS | MUST | migration 已提供，需實測 |
| property_media RLS | MUST | migration 已提供，需實測 |
| inquiries RLS | MUST | migration 已提供，需實測 |
| blocklist RLS | MUST | migration 已提供，需實測 |
| audit_logs RLS | MUST | migration 已提供，需實測 |

## Security

| Item | Level | Status |
| --- | --- | --- |
| Service role key 不進前端 | MUST | 需 build bundle 驗證 |
| CSP | MUST | 未完成 |
| HSTS | MUST | 未完成 |
| Turnstile production | MUST | 部分完成 |
| Rate limit | MUST | 未完成 |
| Honeypot | MUST | 部分完成 |
| Blocklist | SHOULD | 部分完成 |
| 安全錯誤訊息 | MUST | 需驗證 |

## Media

| Item | Level | Status |
| --- | --- | --- |
| 圖片上傳 | MUST | 已完成 preview 驗收 |
| 封面設定 | MUST | 已完成 preview 驗收 |
| 圖片壓縮 | SHOULD | 未完成 |
| Metadata strip | SHOULD | 未完成 |
| MP4 | CAN DEFER | 未完成 |
| YouTube | CAN DEFER | 未完成 |

## Forms

| Item | Level | Status |
| --- | --- | --- |
| Server-side validation | MUST | 部分完成；首頁服務表單 Phase 1 已改送 `/api/public/inquiries` |
| Turnstile | MUST | 部分完成；production 不可 skipped 尚未解決 |
| Honeypot | MUST | 部分完成；首頁服務表單已加入 honeypot 欄位 |
| Rate limit | MUST | 未完成 |
| Email notification | MUST | 新 API 尚未整合 Resend |
| 表單紀錄 | MUST | 部分完成；新 API 寫入 Supabase `inquiries`，需 preview 驗證 |

## SEO

| Item | Level | Status |
| --- | --- | --- |
| 首頁 title / description | MUST | 需驗證 |
| 物件 detail metadata | SHOULD | 部分完成 |
| OG Image | SHOULD | 部分完成 |
| Canonical URL | SHOULD | 部分完成 |
| Sitemap | MUST | 未完成 |
| robots.txt | MUST | 未完成 |
| 404 | MUST | 未完成 |

## Analytics

| Item | Level | Status |
| --- | --- | --- |
| GA4 | SHOULD | 未完成 |
| `/admin/analytics` | CAN DEFER | 未完成 |

## Backup

| Item | Level | Status |
| --- | --- | --- |
| DB backup | MUST | 未驗證 |
| Storage backup | MUST | 未驗證 |
| Env backup | MUST | 未驗證 |
| Restore drill | MUST | 未完成 |

## Deployment

| Item | Level | Status |
| --- | --- | --- |
| Preview build | MUST | 已可部署，需每次重驗 |
| TypeScript | MUST | 本次文件前通過 |
| ESLint | MUST | 本次文件前通過 |
| Production env | MUST | 需正式驗證 |
| Rollback branch | MUST | 已有 production static backup 概念，需保持更新 |
