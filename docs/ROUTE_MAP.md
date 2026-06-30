# Route Map

本文件列出目前路由狀態。產品狀態請看 [../PROJECT_STATUS.md](../PROJECT_STATUS.md)；上線檢查請看 [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md)。

## Public Routes

| Route | Status | Purpose | Source File |
| --- | --- | --- | --- |
| `/` | Existing | 首頁與既有靜態內容 | `app/page.tsx` |
| `/properties` | Existing | 公開物件列表 | `app/(public)/properties/page.tsx` |
| `/properties/[slug]` | Existing | 公開物件詳細頁 | `app/(public)/properties/[slug]/page.tsx` |
| `/calculator` | Planned | 試算工具入口 | 未建立 |
| `/calculator/seller-net-profit` | Planned | 賣屋淨利反推成交價試算 | 未建立 |
| `/calculator/mortgage` | Planned | 房貸月付金試算 | 未建立 |
| `/calculator/purchase-cost` | Planned | 買房總成本試算 | 未建立 |

## Admin Routes

| Route | Status | Purpose | Source File |
| --- | --- | --- | --- |
| `/admin` | Partial | 目前導向物件管理，尚非 Dashboard | `app/admin/page.tsx` |
| `/admin/login` | Existing | Supabase Auth 登入 | `app/admin/login/page.tsx` |
| `/admin/debug/env` | Existing | Preview/development env debug | `app/admin/debug/env/page.tsx` |
| `/admin/properties` | Existing | 物件列表 | `app/admin/properties/page.tsx` |
| `/admin/properties/new` | Existing | 新增物件 | `app/admin/properties/new/page.tsx` |
| `/admin/properties/[id]` | Existing | 導向編輯頁 | `app/admin/properties/[id]/page.tsx` |
| `/admin/properties/[id]/edit` | Existing | 編輯物件、圖片、封面、物件時間軸 | `app/admin/properties/[id]/edit/page.tsx` |
| `/admin/tools/expire-listings` | Existing | 檢查委託到期物件並下架 | `app/admin/tools/expire-listings/page.tsx` |
| `/admin/inquiries` | Existing | 詢問單列表 | `app/admin/inquiries/page.tsx` |
| `/admin/inquiries/[id]` | Existing | 詢問單詳細頁 | `app/admin/inquiries/[id]/page.tsx` |
| `/admin/videos` | Planned | 影音管理 | 未建立 |
| `/admin/audit-logs` | Planned | Audit log 查看 | 未建立 |
| `/admin/blocklist` | Planned | 黑名單管理 | 未建立 |
| `/admin/analytics` | Planned | 流量分析 | 未建立 |

## API Routes

| Route | Status | Purpose | Source File |
| --- | --- | --- | --- |
| `/api/public/inquiries` | Partial | 公開詢問單送出 | `app/api/public/inquiries/route.ts` |
| `/api/public/featured-properties` | Partial | 精選物件資料 | `app/api/public/featured-properties/route.ts` |
| `/api/admin/properties` | Existing | 後台物件 API | `app/api/admin/properties` |
| `/api/admin/property-media` | Existing | 後台物件媒體 API | `app/api/admin/property-media` |
| `/api/admin/inquiries` | Existing | 後台詢問單 API | `app/api/admin/inquiries` |
| `/api/admin/videos` | Planned | 影音管理 API | 未建立 |
| `/api/admin/blocklist` | Planned | 黑名單管理 API | 未建立 |
| `/api/admin/audit-logs` | Planned | Audit log API | 未建立 |
| `/api/admin/analytics` | Planned | 分析 API | 未建立 |

## Anchors

| Anchor | Status | Purpose | Source File |
| --- | --- | --- | --- |
| `/#service-form` | Existing | 首頁服務表單定位 | `content/static-home.html` |
| `/#contact` | Partial | 舊 CTA 或相容定位可能存在 | 需逐步統一 |
| `/#calculator` | Existing | 首頁房貸試算區 | `content/static-home.html` |

## Planned Routes

計畫路由請以 [../ROADMAP.md](../ROADMAP.md) 為優先順序來源。
