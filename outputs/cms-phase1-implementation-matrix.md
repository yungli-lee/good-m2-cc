# CMS Phase 1 implementation matrix — before changes

| 前台位置 | 後台入口 | DB table / column | API | Renderer | 現況 | 問題 | 修改檔案 | 驗收方式 |
|---|---|---|---|---|---|---|---|---|
| `/<custom-slug>` | `/admin/site-pages` | `site_pages.page_key,page_type,status,archived_at` | `/api/admin/site-pages` | none | `BROKEN` | 後台可新增，但沒有獨立公開 route；unknown custom page 被附加到首頁 | `app/(public)/[slug]/page.tsx`, home CMS renderer/query | published 可開啟；draft/archived 404；首頁不再附加 |
| Custom/static page SEO | site page form | `seo_title,seo_description,fallback_cover_url,cover_media_id,published_at,updated_at` | site page admin API | none | `ORPHANED` | 欄位可存但公開 metadata 未讀取 | dynamic page route, SEO helper | metadata/canonical/OG 使用 CMS 值 |
| `/sitemap.xml` | indirect | properties/content/site_pages publication fields | public queries | none | `BROKEN` | route 不存在 | `app/sitemap.ts` | 只包含 published 公開內容 |
| `/robots.txt` | N/A | N/A | N/A | none | `BROKEN` | route 不存在 | `app/robots.ts` | admin/API 禁止索引，指向 sitemap |
| Public Header | `/admin/settings/company` | `company_settings.logo_url,company_name,line_url` | server action | React | `HARDCODED` | Logo/品牌文字未讀 company settings | public layout/header | 後台更新後公開 Header 改變 |
| Public Footer / contact CTA | `/admin/settings/company` | phone/email/social/legal/copyright fields | server action | React | `HARDCODED` | 聯絡方式與社群重複硬編碼 | footer/company settings/revalidation | Header/Footer/聯絡 CTA 同步 |
| Homepage Header/contact/footer | `/admin/settings/company` | company settings fields | `/api/public/home-cms` | legacy HTML + regex | `DUPLICATED` | legacy HTML 另有 Logo、LINE、電話、Email、社群 hardcode | home API/client/renderer | CMS 設定替換 legacy 公開值 |
| Property detail company panel | `/admin/settings/company` | company settings fields | server query | React | `CONNECTED` | 已讀取設定，但其他公開元件未共用 | regression only | 既有顯示不退步 |
| Homepage CMS sections | `/admin/site-pages`, `/admin/home-campaigns` | campaigns/site_pages | `/api/public/home-cms` | legacy HTML + regex renderer | `PARTIAL` | supported section 可替換；unknown custom 被錯誤附加；無 warning | `lib/home-cms/render.ts`, admin labels | supported 有效；unsupported warning 且不假裝接線 |
| 阿勇生活小提醒列表 | `/admin/site-pages` | `page_type=reminder,status,sort_order,published_at,cover,subtitle,body` | site page APIs + home API | reminder renderer | `PARTIAL` | 多筆 CRUD 已有；獨立 route/SEO/sitemap/cache 不完整 | dynamic route, renderer, revalidation, sitemap | 兩筆排序、上下架、刪除、獨立網址 |
| Site page cache invalidation | site page form | page key/status | site page APIs/actions | Next cache | `PARTIAL` | 只 revalidate `/` 與 admin，未清 slug/sitemap | site page APIs/actions | 儲存後 slug 與 sitemap 無需部署即更新 |
| Company settings cache invalidation | company form | `company_settings.*` | server action | Next cache | `PARTIAL` | 只清 admin 與 properties | company action | `/`、`/contact`、公開 layouts 同步 |
| Reserved slug validation | site page form | `site_pages.page_key` | site page APIs | route matching | `BROKEN` | schema 只驗格式，可能與固定 route 衝突 | routing helper/schema/form | `properties/knowledge/calculator/contact/admin/api` 被拒絕 |

Allowed status vocabulary: `CONNECTED`, `PARTIAL`, `HARDCODED`, `BROKEN`,
`ORPHANED`, `DUPLICATED`.
