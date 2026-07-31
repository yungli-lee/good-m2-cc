# 全站前台與後台 CMS 維護能力盤點

盤點日期：2026-07-30  
範圍：Repository 靜態盤點；Production schema／後台逐頁證據尚未在本次取得，標記為 `UNKNOWN_PRODUCTION`。

## 1. 結論摘要

目前網站已具備可用的 CMS 基礎：公司設定、導覽、首頁 Campaign、site pages、知識庫、媒體、物件與 People CRM 均有 Repository 實作。主要缺口集中在首頁仍以 `public/legacy-static/home-body.html` 作為版面與大量文案來源，再由 client-side DOM replacement 套用部分 CMS 資料；因此首頁的標題、CTA、服務區塊、試算工具卡、承諾與部分圖片仍需改程式或替換靜態檔。

Production 是否已部署與實際 schema／資料狀態，本文件不以 Repository 推測，須補 Cloudflare deployment 與 Supabase catalog evidence 後才能將 `UNKNOWN_PRODUCTION` 改為確定狀態。

## 2. Route inventory

| Route | 用途 | Repository 資料來源 | 後台入口 | CMS 完成度 | Production |
|---|---|---|---|---|---|
| `/` | 首頁 | legacy HTML + `/api/public/home-cms` + public property/knowledge fetch | 首頁檔期、site pages、公司、導覽、媒體 | PARTIAL | UNKNOWN_PRODUCTION |
| `/properties` | 公開物件列表 | `lib/properties/queries.ts`／公開 API | `/admin/properties` | COMPLETE | UNKNOWN_PRODUCTION |
| `/properties/[slug]` | 物件詳情 | property query、media、SEO resolver | `/admin/properties/[id]/edit` | COMPLETE | UNKNOWN_PRODUCTION |
| `/knowledge` | 知識列表、搜尋、篩選、分頁 | content queries | `/admin/knowledge` | COMPLETE | UNKNOWN_PRODUCTION |
| `/knowledge/[slug]` | 知識文章、SEO、媒體 | content item | `/admin/knowledge/[id]/edit` | COMPLETE | UNKNOWN_PRODUCTION |
| `/contact` | 聯絡頁 | site page/company settings/legacy content | 公司設定、site pages | PARTIAL | UNKNOWN_PRODUCTION |
| `/calculator` | 舊試算入口 | React route + calculator components | 無（公式屬程式） | PARTIAL | UNKNOWN_PRODUCTION |
| `/calculator/mortgage` | 房貸試算 | calculator module + UI labels | 無 | COMPLETE | UNKNOWN_PRODUCTION |
| `/calculator/purchase-cost` | 買房成本試算 | calculator module + UI labels | 無 | COMPLETE | UNKNOWN_PRODUCTION |
| `/calculators` | 試算工具中心 | React 靜態工具卡 | 無 | HARDCODED | UNKNOWN_PRODUCTION |
| `/calculators/owner-net-all-in` | 屋主實拿試算 | 共用 calculator module + metadata/company | 無 | PARTIAL | UNKNOWN_PRODUCTION |
| `/{custom-slug}` | site page／自訂頁 | site_pages routing | `/admin/site-pages` | PARTIAL | UNKNOWN_PRODUCTION |
| `/robots.txt` | robots | `app/robots.ts` | 無 | HARDCODED | UNKNOWN_PRODUCTION |
| `/sitemap.xml` | sitemap | `app/sitemap.ts` + queries | 無 | PARTIAL | UNKNOWN_PRODUCTION |
| 404 | not found | Next fallback | 無 | HARDCODED | UNKNOWN_PRODUCTION |
| `/api/public/*` | 公開物件、知識、首頁、詢問 | Route handlers + DB | 對應 CMS | COMPLETE | UNKNOWN_PRODUCTION |

## 3. 區塊來源與可維護性

| 頁面／區塊 | 文字來源 | 圖片來源 | 連結／排序／顯示 | 後台可維護 | 判定與問題 |
|---|---|---|---|---|---|
| Header／Mobile | company settings 的品牌名、副標；結構在 legacy HTML | company `brand_logo_url`，legacy 有 fallback | 導覽由 `site_navigation_items` 注入 | PARTIAL | Logo/品牌可改；HTML 結構與 fallback 仍在檔案 |
| Footer | company settings legal/company fields；部分固定文案 | brand logo／legacy asset | footer navigation DB | PARTIAL | 社群、版權與部分文字仍由 legacy HTML／render hardcode |
| 首頁 Hero | Campaign DB 覆蓋整個 hero；無 campaign 時 legacy HTML | Campaign media 或 `/assets/hero-ayong-wu-laptop.jpeg` | Campaign CTA 可改；fallback 固定 | PARTIAL | eyebrow、fallback CTA、fallback 圖片無完整 CMS 控制 |
| 精選物件 | 公開 properties API | property media | 物件排序／精選由 property data | PARTIAL | 區塊標題、空狀態與 CTA 在 legacy HTML |
| 最新物件／搜尋 | 公開 properties API | property media | 查詢由前端固定 | PARTIAL | 行銷文案、查詢 placeholder、空狀態 hardcode |
| 最新知識 | public knowledge API | knowledge media | 依 query 排序 | PARTIAL | 區塊標題、摘要 fallback、CTA hardcode |
| 服務理念 | site_pages `philosophy` 可覆蓋 intro section | page cover media | 顯示由 page 存在決定 | PARTIAL | legacy split copy 與 quote cards 不受 CMS 控制 |
| 服務項目 | site_pages `services` 可覆蓋服務 section | page cover media | 顯示由 page 存在決定 | PARTIAL | legacy 服務清單與圖片仍固定 |
| 生活提醒 | site_pages `reminder` 可重複管理 | page media | DB 順序／狀態 | COMPLETE | section eyebrow、說明文字仍固定 |
| 買賣流程／團隊 | site page 部分映射 | legacy images／page cover | route 固定 | PARTIAL | 版面、fallback、部分文案未完全 CMS 化 |
| 聯絡 CTA／表單 | company settings + inquiry API | contact asset／company media | CTA/label 多為固定 | PARTIAL | 可送出但行銷文案與欄位說明未集中管理 |
| 試算工具卡 | React route/page hardcode | 無 | 卡片、排序、摘要固定 | HARDCODED | 新增工具需改程式與部署 |
| SEO | page/property/knowledge 欄位；root/page metadata | 部分 OG image 未集中 | canonical/robots 多為程式 | PARTIAL | 首頁與 calculators 的 description/OG fallback 固定 |

## 4. Hardcode 盤點（代表性清單）

| 檔案 | Hardcode | 前台位置 | 是否 CMS 化 | 建議資料來源 |
|---|---|---|---|---|
| `public/legacy-static/home-body.html` | Hero 主標、說明、服務理念、服務清單、承諾、流程、CTA、圖片 | 首頁多數區塊 | 是（可變行銷內容） | `home_sections`／site_pages + media |
| `public/legacy-static/home-body.html` | `/assets/hero-ayong-wu-laptop.jpeg`、buyer journey、showing-home | 首頁圖片 | 是 | media asset + section image relation |
| `lib/home-cms/render.ts` | Hero fallback image、`Line 阿勇諮詢`、首頁 section eyebrow、生活提醒說明 | 首頁 fallback | 部分 | company/site settings + section config |
| `lib/home-cms/render.ts` | `https://line.me/...`、Facebook、YouTube、TikTok fallback | Header/Footer/CTA | 是 | company_settings（已部分存在，應移除 renderer fallback） |
| `components/calculators/purchase-cost-calculator.tsx` | Line CTA 文案 | 試算結果頁 | 否（功能 UI 可保留） | 可選 site settings CTA |
| `app/calculators/page.tsx`、相關 calculator pages | 工具卡標題、摘要、排序、連結 | 試算中心 | 是（若營運需要） | `calculator_catalog`，公式仍留在程式 |
| `app/page.tsx` | 首頁 description | HTML metadata | 是 | site/company SEO settings |
| `components/content/knowledge-card.tsx` | 空摘要 fallback、閱讀全文 | 知識卡 | 通常否 | 保留 UI fallback；可讓 CMS 提供 default copy |
| `app/robots.ts`、`app/sitemap.ts` | robots、路由收錄邏輯 | SEO | 部分 | robots policy 可 config；路由清單應 query published pages |

程式必要的 enum、驗證訊息、稅務公式、權限錯誤與安全 fallback 不建議搬進 CMS。

## 5. 首頁實際資料流

```text
company_settings / home_campaigns / site_pages / site_navigation_items
        ↓
app/api/public/home-cms/route.ts + public property/knowledge API
        ↓
components/home-cms-client.tsx
        ↓
fetch('/legacy-static/home-body.html')
        ↓
lib/home-cms/render.ts（字串替換、section regex、fallback）
        ↓
DOM 注入 + /legacy-static/script.js
        ↓
瀏覽器首頁
```

這是目前主要架構風險：CMS 只覆蓋已知 selector／section，新增或改版區塊仍需修改 legacy HTML、renderer regex 或 client script；若 selector 變更，CMS 可能靜默失效。建議逐步改成 server-rendered React section registry，保留 legacy HTML 作為短期 fallback，最終移除 DOM replacement。

## 6. 後台能力盤點

| 後台 | 已有能力 | 缺口 |
|---|---|---|
| `/admin/home-campaigns` | hero title/subtitle/body、圖片、CTA、狀態、時間 | fallback／首頁其他 section 不在同一處 |
| `/admin/site-pages` | 新增、編輯、發布、封存、SEO、cover/media | 首頁版面區塊與排序控制有限 |
| `/admin/knowledge` | 文章、分類、狀態、SEO、媒體、分頁 | 部分首頁摘要/卡片文案仍固定 |
| `/admin/properties` | 物件、媒體、封面、timeline、Excel、業務欄位 | 公開列表區塊文案與排序規則非 CMS |
| `/admin/media` | 媒體 metadata、用途、替換 | 未形成所有首頁區塊的明確 asset binding |
| `/admin/navigation` | Header/Mobile/Footer label、href、排序、顯示 | 導覽與頁面發布的驗證需更明確 |
| `/admin/settings/company` | 品牌、公司、加盟店、社群、Logo | SEO defaults、全站 CTA 尚未集中 |
| `/admin/home-campaigns` | 首頁 campaign CRUD | 非 hero 的首頁區塊無排序／顯示控制 |
| `/admin/tools` | 工具功能頁 | 工具目錄卡片仍由程式維護 |
| `/admin/people` | People CRUD、關聯、活動 | 非公開內容；與本次前台 CMS 盤點獨立 |

## 7. 問題分級與改善方案

### P0／P1（先處理）

1. **首頁雙 renderer／靜默失效風險（P1）**：建立 section registry、渲染契約與整頁 snapshot；CMS publish 後以 revalidation 更新，不再依賴 client DOM replace。
2. **Production evidence 缺失（P1）**：補 Cloudflare deployed commit、Supabase catalog、PostgREST cache 與各表 row/column evidence；未知不得視為完成。
3. **公司／CTA fallback 分散（P1）**：建立 `site_settings`／SEO defaults（或擴充 company_settings），由單一 query 提供品牌、CTA、社群與預設圖片。

### P2

4. **首頁非 Hero 區塊不可排序／隱藏**：新增 `home_sections`（key、title、eyebrow、body、media_id、sort_order、is_visible、cta JSON、published_at）。
5. **工具目錄硬編碼**：新增 `calculator_catalog`；只管理 label、摘要、route、排序、啟用，公式與 validation 留在程式。
6. **SEO 未集中**：新增 route-level SEO settings，統一 title、description、canonical、OG/Twitter image、robots；page/property/knowledge 欄位優先，其次 route defaults。
7. **媒體用途與 fallback**：所有前台圖片改成 media id 關聯，保存 alt、crop/object-fit 與 fallback policy。
8. **導覽／頁面一致性**：發布導覽前檢查 target page published；顯示 broken link warning；自訂頁自動納入 sitemap。

## 8. 建議實作順序

1. 先完成 Production/Preview evidence 與 renderer contract（不改 schema）。
2. 將首頁拆成 React section registry，先搬 Hero、服務、流程、CTA；保留 legacy fallback。
3. 擴充既有 site_pages／home_campaigns／media 的欄位與排序，不立即新增大量 table。
4. 集中 SEO defaults 與社群/CTA 設定，加入 preview/發布與 revalidation。
5. 建立 calculator catalog 與首頁 section manager。
6. 加入內容品質檢查：缺圖 alt、broken href、draft 被導覽、無 canonical、重複 slug。
7. 最後移除 legacy HTML 與 DOM replacement，完成 production smoke/regression。

## 9. 驗收與安全 Gate

- 每個 route 有 source-of-truth、後台入口、顯示狀態與 production evidence。
- CMS publish 後不需部署即可反映，且 revalidation 有測試。
- 既有 property、knowledge、navigation、company、CRM regression 全部 PASS。
- 不將公式、權限、enum、錯誤安全訊息搬入 CMS。
- Production schema 變更先做 additive migration、Preview 驗證、人工核准，再安排窗口。

### 本次判定

`AUDIT_COMPLETE_REQUIRES_PRODUCTION_EVIDENCE`

本文件只完成 Repository 盤點與改善設計；Production route、schema、deployment 與 CMS 實際資料仍待唯讀證據補齊。
