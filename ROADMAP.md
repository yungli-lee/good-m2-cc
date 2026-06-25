# Roadmap

本文件只規劃接下來的產品順序。當前完成度請看 [PROJECT_STATUS.md](PROJECT_STATUS.md)；上線前判斷請看 [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md)；9-16 項細節請看 [docs/FEATURE_BACKLOG_09_16.md](docs/FEATURE_BACKLOG_09_16.md)。

## Project Governance

所有 Sprint 均遵循 [PROJECT_WORKING_AGREEMENT.md](PROJECT_WORKING_AGREEMENT.md)。技術開發規範請參閱 [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)。

## Sprint A: 正式商用平台核心

### Goal

把 good.m2.cc 從靜態官網整理成可驗收的 Next.js / Supabase 核心平台，包含登入、物件、圖片、詢問單、安全基礎與上線文件。

### Scope

Priority 1

- 完成 Supabase Auth 登入與角色檢查。
- 完成主推物件 CRUD 基礎。
- 完成圖片上傳、封面設定、公開物件頁。
- 完成表單 API、server-side validation、honeypot、Turnstile production 驗證。
- 完成 rate limit 與 blocklist server-side 檢查。
- 完成 audit log 基礎寫入與最小查看方式。

Priority 2

- 完成首頁精選物件區塊。
- 完成詢問單後台篩選與狀態管理。
- 完成 production security headers。
- 完成 go-live checklist 與 rollback SOP。

Priority 3

- 補強 admin 使用體驗、錯誤訊息、空狀態。
- 補足文件與操作手冊。

### Non Goals

- 不做 TikTok 影音後台。
- 不做 Analytics Dashboard。
- 不做完整 Dashboard。
- 不做 MP4、YouTube、拖曳多張、圖片壓縮進階流程。

## Sprint B: 內容與工具

### Goal

補齊公開內容、試算工具與前台轉換流程。

### Scope

Priority 1

- 建立 `/calculator` 工具入口。
- 建立 `/calculator/seller-net-profit`。
- 建立 `/calculator/mortgage`。
- 建立 `/calculator/purchase-cost`。

Priority 2

- 首頁精選物件體驗優化。
- 物件詳細頁輪播與手機版優化。
- 服務表單與物件詢問流程端到端驗證。

Priority 3

- TikTok 最新影音區塊。
- 影片手動管理方案。

### Non Goals

- 不做 Analytics Dashboard。
- 不在 Sprint B 改 production 架構。
- 不改 Hero 文案或品牌名稱。

## Sprint C: SEO、Analytics、營運

### Goal

把 preview 可用平台提升成可長期營運與追蹤成效的平台。

### Scope

Priority 1

- SEO metadata、sitemap、robots.txt、404。
- GA4 整合。
- production go-live final checklist。

Priority 2

- `/admin/analytics`。
- `/admin/dashboard`。
- 維護、備份與監控例行化。

Priority 3

- TikTok API 或 embed 進階整合。
- 圖片壓縮、EXIF metadata strip、自動縮圖。

### Non Goals

- 不把未驗證功能直接推 production。
- 不將 secret 寫入前端或公開 repo。
