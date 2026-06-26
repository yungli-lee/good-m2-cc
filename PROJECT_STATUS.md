# Project Status

本文件是 good.m2.cc 目前產品狀態的入口文件。詳細技術架構請以 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 為準；路由請以 [docs/ROUTE_MAP.md](docs/ROUTE_MAP.md) 為準；安全與上線判斷請以 [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md) 與 [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md) 為準；後續排程請以 [ROADMAP.md](ROADMAP.md) 為準。

## Project Overview

good.m2.cc 目前在 `preview/sprint-a-production-wiring` 分支整併為 Next.js App Router + Supabase 的 preview/staging 版本。既有靜態首頁內容已保留，後台物件管理、登入、圖片上傳、封面設定、公開物件頁與詢問單基礎流程已部分完成。

Production 仍不建議直接切換至此分支。原因請見 [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md)。

## Current Branch

`preview/sprint-a-production-wiring`

## Project Governance

所有 Sprint 與專案接手流程請先遵循 [PROJECT_WORKING_AGREEMENT.md](PROJECT_WORKING_AGREEMENT.md)。技術開發規範請參閱 [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)。

## Documentation

- README
- ROADMAP
- PROJECT_STATUS
- RELEASE_NOTES
- CONTRIBUTING.md：開發規範與 Rule No.5 文件同步標準

`RELEASE_NOTES.md` 作為每個 module 完成後的版本紀錄與驗證摘要。

Engineering Standard:

- CONTRIBUTING.md 為專案開發規範。
- 所有開發遵循 Yongmei OS Engineering Standard Rule No.1~No.6。

## Sprint A Completion

Sprint A 目前是「核心平台 preview 可驗收」狀態，不是 production ready。主要已完成範圍為：Supabase Auth 後台登入、物件 CRUD 基礎、圖片上傳與封面、公開物件頁、部分 audit log、部分詢問單後台。

## Sprint A Milestone 2 Progress

- M2-001 Property Edit：已完成 `/admin/properties/[id]/edit` 四欄位編輯。
- M2-002 Property Publish Workflow：已完成 `/admin/properties` 列表發布與下架回草稿。
- M2-003 Featured Property：已完成 `/admin/properties` 列表精選標記切換，使用既有 `properties.is_featured` 欄位。限制：本階段不做首頁串接、不做 media/delete/SEO。

## Sprint 0-16 Status Overview

| No | 功能 | 狀態 | 完成度 |
| --- | --- | --- | --- |
| 0 | Route 規劃 | 部分完成 | 50% |
| 1 | Hero | 已完成 | 90% |
| 2 | 架構與資安規格 | 部分完成 | 55% |
| 3 | 主推物件 | 部分完成 | 70% |
| 4 | 表單安全 | 部分完成 | 50% |
| 5 | Seller Calculator | 未完成 | 15% |
| 6 | Mortgage Calculator | 部分完成 | 35% |
| 7 | Purchase Cost | 未完成 | 0% |
| 8 | Featured Properties | 部分完成 | 55% |
| 9 | TikTok | 未完成 | 0% |
| 10 | Audit Log | 部分完成 | 55% |
| 11 | Blocklist | 部分完成 | 45% |
| 12 | Dashboard | 未完成 | 0% |
| 13 | Inquiries | 部分完成 | 60% |
| 14 | Go Live | 部分完成 | 25% |
| 15 | Maintenance | 未完成 | 10% |
| 16 | Analytics | 未完成 | 0% |

## Completed

- 首頁 Hero 圖片、文案、CTA 與深藍遮罩已保留於 Next 首頁來源。
- `/admin/login` 已使用 Supabase Auth 登入流程。
- `/admin/properties`、`/admin/properties/new`、`/admin/properties/[id]/edit` 已存在。
- `/properties`、`/properties/[slug]` 已存在，前台只顯示公開物件的方向已建立。
- 單張圖片上傳與封面設定已完成 preview 驗收。
- `supabase/migrations/202606250101_sprint_a_core_platform.sql` 已建立核心資料表、RLS 與 storage bucket 規格。

## Partially Complete

- 表單安全已建立 `inquiries`、`blocklist`、Turnstile 驗證入口與 API；首頁服務表單 Phase 1 已改送 `/api/public/inquiries`。Rate limit、Turnstile production 強制驗證與新 API Resend 通知仍未完成。
- Audit log 有資料表與寫入 helper，但尚未建立 `/admin/audit-logs` 查看介面。
- Blocklist 有資料表與表單檢查，但尚未建立 `/admin/blocklist` 管理介面。
- Inquiries 後台已有列表與詳細頁，但篩選、搜尋、CSV、刪除與完整 audit 還未完成。
- 精選物件資料條件、API 與後台 `is_featured` 切換已存在，但首頁精選物件區塊仍未完整上線。

## Not Yet Complete

- TikTok 最新影音、影片後台。
- Dashboard 總覽。
- Analytics Dashboard 與 GA4 文件化整合。
- `/calculator` 工具入口與三個獨立試算工具路由。
- 圖片壓縮、EXIF metadata strip、MP4、YouTube、輪播。
- Production go-live 完整驗收與備份演練。

## Technical Debt Backlog

### A-099 Legacy Static Cleanup

目的：集中管理從靜態網站轉換到 Next.js 後可能殘留的相對路徑、舊 API、SEO、資源載入、路由相容性與前端錯誤問題。

Checklist:

- [ ] HTML 相對路徑
- [ ] Image assets 路徑
- [ ] JS API endpoint
- [ ] CSS resource path
- [ ] favicon
- [ ] OG image
- [ ] manifest
- [ ] robots.txt
- [ ] sitemap.xml
- [ ] canonical URL
- [ ] structured data (JSON-LD)
- [ ] metadata consistency
- [ ] anchor navigation
- [ ] client-side routing compatibility
- [ ] legacy script compatibility
- [ ] browser console warnings
- [ ] Network 404 檢查
- [ ] Mixed Content 檢查
- [ ] Preview 與 Production 一致性
- [ ] Performance
- [ ] Accessibility

分類摘要：

- Technical Debt Backlog
- A-099 Legacy Static Cleanup
- HTML
- Assets
- API
- Routing
- SEO
- Metadata
- Console
- Network
- Performance
- Accessibility

Done Criteria:

Legacy Static Cleanup 完成代表：

- Preview 無 404 Assets
- Preview 無 JS Console Error
- Network 無錯誤資源
- 所有 API Endpoint 正確
- 所有圖片正常載入
- SEO 基本資源完整
- Client-side navigation 正常
- Mobile / Desktop 驗證完成
- Preview 與 Production 行為一致

## Known Production Risk

- 目前不建議正式 production 切換；請先以 preview/staging 驗收。
- CSP 與 HSTS 尚未完整 production 化。
- Turnstile、rate limit、首頁表單 preview 端到端驗證與新 API 通知信需完成。
- D1 與 Supabase 兩套資料來源共存，需避免 production 設定誤用。
- public Supabase key 已放入 Wrangler vars；service role key 不得放到前端或公開設定。

## Next Priority

1. 先補 Sprint A 必須項：表單安全端到端、rate limit、首頁精選物件、audit/blocklist/inquiries 最小管理能力。
2. 再做 production security hardening：CSP、HSTS、Turnstile production、備份與 rollback SOP。
3. 最後才排 Sprint B/C：試算工具、TikTok、Dashboard、Analytics。
