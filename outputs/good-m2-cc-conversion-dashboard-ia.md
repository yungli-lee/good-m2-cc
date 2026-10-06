# good-m2-cc `/admin/analyze` Information Architecture

本 IA 是 Phase 2 提案；Phase 0 不開發頁面。所有 query 必填 date range、environment=production、排除 bot/internal，分母由同一 semantic layer 定義。

## 1. 總覽

Range：7/30/90 天及自訂（限制上限）。Cards：詢問、有效客需、帶看、斡旋、成交、成交總價、服務費。漏斗顯示每階段 count、conversion、分母說明；另顯示 median/percentile 首次接觸→成交天數。

## 2. 來源

Dimensions：source / medium / campaign。Metrics：sessions、inquiries、qualified leads、showings、deals won、成交率、deal value、commission。可切 first-touch / lead-touch / last-non-direct；畫面必須標示模型，禁止混成一欄。

## 3. 物件

每 property：detail views、media opens、LINE/phone/form、linked people、showings、offers、won/lost、deal value。列表只顯示已知 entity id；missing property context 進資料品質，不歸「其他物件」。

## 4. 內容

首頁 section/campaign、knowledge、calculator、CTA：views、engaged sessions、assisted inquiries、assisted deals。Assisted 需明示「曾出現在 journey」而非因果貢獻。

## 5. 漏斗

`曝光 → property detail → inquiry_created → qualified requirement → showing_completed → negotiation_started → deal_won`。可依來源、物件、assignee 分群；cohort 使用 stage 進入時間，不用目前 status 回推。

## 6. 資料品質

- 無來源 inquiry（lead attribution missing/unknown）
- 無 person_id 的 attribution
- duplicate event_id rejects
- preview event in production report
- bot/internal traffic
- event 缺 property_id
- won deal 無 attribution
- ingestion reject/error/rate limit
- unknown event version/property enum

## 指標與分母

| 指標 | 分子 | 分母 |
|---|---|---|
| 曝光→詢問率 | distinct inquiry_created | eligible production sessions with page_view |
| 物件詳情→詢問率 | inquiry with same/journey property | distinct sessions viewing property |
| 詢問→CRM 建檔率 | inquiry linked to person | non-spam inquiry_created |
| CRM→有效客需率 | qualified requirement/person | linked leads |
| 有效客需→帶看率 | qualified leads with completed showing | qualified leads |
| 帶看→斡旋率 | journeys with negotiation | completed showing journeys |
| 斡旋→成交率 | closed_won deals | negotiations started |
| 每來源成交率 | deals won attributed by selected model | eligible leads attributed by same model |

同一 funnel entity 必須定義去重 key（session/inquiry/person/deal）；不能把 event row count 當人數。成交金額與服務費只來自 immutable deal snapshot。

## Query/performance contract

- Analyze 首頁只讀 rollup/materialized query，不 raw scan 全 events。
- 所有 endpoint 限 date range、pagination/top-N；大明細異步匯出。
- 避免 N+1，使用 grouped query/RPC；索引與 explain 在 Preview 驗證。
- UI 顯示資料新鮮時間、模型、timezone、已排除流量。
