# good-m2-cc 成交歸因分析 Phase 0 Baseline

日期：2026-08-06

基準：`42b8fb170e1664966417248d9ff1bc29284d48f5`

範圍：只讀程式與 migration 盤點；未查寫 Production/Preview DB、未修改產品功能。

## 結論

現況是「已有零散骨架，但沒有可串到成交的歸因系統」。`analytics_events`、型別、清理函式與 server-side insert helper 已存在；實際 app/components 沒有 producer 呼叫，前台入口也沒有 visitor/session/UTM continuity。CRM 能管理 People、客需、活動與 People–Property；帶看、出價、議價、成交只存在於 `property_timeline_events` 的自由文字事件，無 person/requirement/deal/value/commission 關聯，因此不能產生可信成交報表。

## 現有分析工具

| 工具 | 狀態 | 程式證據 | 判定 |
|---|---|---|---|
| First-party `analytics_events` | PARTIAL | `202607010104_analytics_events_foundation.sql`, `202607010105_media_analytics_foundation_refinements.sql`, `lib/analytics/*` | 表與 helper 已有；沒有實際 producer、event_id、event_version、environment 或 CRM FK |
| Microsoft Clarity | MISSING | 全 repo 無 script/config/env 命中 | 未安裝 |
| GA4 | MISSING | 無 `gtag`, measurement ID 或 dependency | 未安裝 |
| Google Tag Manager | MISSING | 無 GTM container/script | 未安裝 |
| Cloudflare Web Analytics | AMBIGUOUS | repo 無 beacon/script；Dashboard 帳號層設定不在程式證據內 | 不可宣稱已啟用 |
| Google Search Console | AMBIGUOUS | 無 verification metadata/file；外部資產不在 repo | 不可由程式證明 |
| 自訂 tracking scripts | MISSING | legacy script 處理 UI/表單，沒有 analytics 呼叫 | 無事件 producer |
| UTM 解析與保存 | MISSING | 只有 analytics 型別欄位，沒有 URL parser/session persistence | 無 first/lead/last touch |
| cookies/localStorage | MISSING（分析用途） | Supabase auth cookie；knowledge editor 只用 sessionStorage toast | 無 analytics identity |

Preview/Production 差異：程式可取得 `CF_PAGES_BRANCH` 並已有 `isPreviewEnvironment()` 類邏輯，但 analytics schema/payload 沒有 `environment`，所以若開始寫入，Preview 污染 Production 報表的風險為 HIGH。現有 headers 未設定 CSP，因此目前不存在 CSP 阻擋 tracking script 的程式證據；Cloudflare cache 是否影響第三方 script 仍需 Phase 1 Preview network evidence。

## 前台轉換入口盤點

| 入口 | Route / Component | 現況 | property/campaign/source | CRM 寫入與風險 |
|---|---|---|---|---|
| 首頁 LINE / CTA | `/`, `HomeCampaignCarousel`, legacy sections, `HomeFooter` | 多個 `<a>` 直接外連 | campaign CTA 來自 CMS，但 click 無 campaign/property/session | 無 CRM；無 tracking |
| Header/Footer LINE | public layout footer / homepage footer | Footer 有 LINE、電話、Email、表單 | 無 property/campaign/source | 無 CRM；點擊不可歸因 |
| 電話連結 | property detail、contact、footer、legacy sections | `tel:` | property detail 可由頁面推導但未送出 | 無 CRM；通話結果需人工關聯 |
| 首頁服務表單 | `/#service-form`, `HomeLegacyEnhancements`, `public/legacy-static/script.js` | POST `/api/public/inquiries`，按鈕 disable | 只存 `source_page`; 不存 session/UTM；首頁表單沒有 property_id | 寫 `inquiries`; client disable 降低雙擊，但無 idempotency key，網路重送仍可重複 |
| 物件詢問 | `/properties/[slug]` | 目前只有 LINE 與回首頁表單；頁面明示完整表單尚未完成 | LINE 沒帶 property_id；回首頁後 context 遺失 | MISSING |
| Google Maps | contact/company links | 直接外連 | 無 context | 無 tracking |
| 物件分享 | knowledge 有 LINE/Facebook 分享；物件頁無明確分享 UI | knowledge URL 可識別 article | 無 session/campaign event | 無 CRM |
| 計算器 | `/calculator/*`, `/calculators/*` | 可互動，purchase-cost 有 LINE CTA | 無結果事件與 CTA attribution | 無 CRM |
| 物件圖片/影片 | `PropertyMediaGallery`, `VideoLightbox`, homepage carousel | 完整播放元件存在 | UI 可取得 property/media/campaign id | 無 view/open/complete event |
| 搜尋/篩選/排序 | `/properties`, `HomePropertySearch` | 首頁 fetch public properties；列表 server filters | query 可取得；未生成 session event | 無 CRM |
| 知識文章 | `/knowledge/[slug]` | 分享與 LINE CTA | article id/slug 可取得 | 無 view/click attribution |
| 社群廣告連結 | landing URL | 無 UTM parser | 無 normalize/persistence | 無 first touch |

## CRM lifecycle 能力

| 能力 | 狀態 | 證據與限制 |
|---|---|---|
| Inquiry | FULL（收件）/ PARTIAL（歸因） | `inquiries` 有 contact、property_id、source_page、assigned_to、status；無 visitor/session/UTM/person_id |
| People | FULL（基本建檔） | `people`, `person_roles`, assigned_to；source 是粗分類，不是 touch snapshot |
| Customer requirement | FULL（Phase 1） | `crm_customer_requirements`, assigned_user_id, statuses；不代表 qualified lead 或成交 |
| Activities | PARTIAL | `people_activities` 有 visit/phone/line 等，但 visit 是一般活動，無 property/showing lifecycle 狀態 |
| People–Property | PARTIAL | relationship type 可為 viewer/negotiator 等；不是帶看或斡旋交易紀錄 |
| Property lifecycle | PARTIAL | draft/published/archived/expired；下架理由可為「成交」，但不可信任為 deal |
| Showing | PARTIAL | timeline event `showing`，無 person/requirement、開始/完成狀態 |
| Offer | PARTIAL | timeline event `offer`，自由文字，無金額與 actor |
| Negotiation | PARTIAL | timeline event `negotiation` 或 relation `negotiator`，無交易實體 |
| Deal / transaction | MISSING | 無 deal table、deal status、won/lost timestamp |
| Commission/service fee | PARTIAL/MISSING | property 有 `service_fee_rate text`; 無成交佣金 snapshot/收入 |

## Attribution gaps

1. `analytics_events.id` 是 DB row id，不是 client-generated idempotency `event_id`。
2. 無 event version、received_at、environment、visitor_id、person/inquiry/requirement/deal FK。
3. metadata 只有 4KB size guard，沒有 per-event allowlist；PII regex 只清理 search query。
4. `inquiry_created` 未寫 analytics，也沒有 inquiry 與匿名 session 的 linkage。
5. inquiry→person 沒有正式關聯；People `source` 無法重建 first/lead/last touch。
6. `deal_won` 無可信 server-side source；property timeline `closed` 不足以代表成交。
7. 沒有 bot/internal traffic rule、retention、rollup、data-quality report。

## 建議最小 Phase 1

先建立三個核心實體：擴充/取代現有 `analytics_events` contract、`lead_attributions`、`deal_attributions`。不要先建 visitor/session/rollup 實體表；visitor/session 先作 events 欄位，確認流量後再決定。Phase 1 必須先有 schema migration review、Preview isolation、匿名 consent/retention 決策與 event producer tests。

## 風險

- Privacy HIGH：現有 metadata 接受任意 object，可能誤收 DOM/訊息/PII。
- Attribution HIGH：direct 回訪與 internal navigation 會覆蓋來源，因為目前完全沒有 persistence 規則。
- Data integrity HIGH：沒有 idempotency，inquiry 與事件都可能重送。
- Cloudflare MEDIUM/HIGH：若同步寫事件或 Analyze raw scan，可能增加 CPU 並重現 1102；必須 beacon/non-blocking、payload limit、時間範圍與 rollup。
