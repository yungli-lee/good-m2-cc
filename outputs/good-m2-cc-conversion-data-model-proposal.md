# good-m2-cc Conversion Data Model Proposal

本文件只提案，不是 migration。現有 `analytics_events` 有資料相容風險，Phase 1 必須先做 Preview/Production read-only schema與 row-count precheck。

## Recommended minimum schema

### 1. analytics_events（擴充現有表，必要）

用途：first-party append-only event ledger。PK 保留 DB `id` 或改明確 row id；新增 unique `event_id`。必要欄位依 taxonomy；`event_properties jsonb default {}`。FK 對 public entities 使用 `on delete set null`，但事件 snapshot 不依賴 join 才可理解。

- Unique: `(environment,event_id)`。
- Index: `(environment,occurred_at desc)`, `(environment,event_name,occurred_at desc)`, visitor/session, property, inquiry, person, deal partial indexes。
- RLS: anon/authenticated 無直接 insert；只允許 service role ingestion；admin/owner read，Preview/Production 還需 deployment-level separation。
- Retention: raw anonymous web event 建議 13 個月（需法務/營運批准）；CRM/deal lifecycle 與 attribution依交易保存政策；IP hash 更短（例如 7–30 天）。
- Volume: 初期估 10^4–10^6/year，需 payload limit、partition/rollup threshold。
- Rollback: 停 producer；新增欄位保留；不直接 drop 歷史資料。

### 2. lead_attributions（必要）

用途：inquiry 成功與後續 person/requirement linkage 的 immutable/append-audited snapshot。PK UUID；FK inquiry required，person/requirement nullable until linked；first/lead/last touch ids；snapshot source/medium/campaign/landing/property/timestamps。

- Unique: inquiry_id（第一版一詢問一 snapshot；合併用 linkage history，不覆寫原始）。
- Index: person_id, requirement_id, inquiry_at, campaign。
- RLS: authenticated editor/admin/owner scoped read；只有 trusted server write/link。
- Retention: 與 CRM inquiry/交易政策一致。
- Expected volume: 與有效 inquiry 同量級，低於 events。
- Rollback: producer stop；snapshot 保留或資料治理程序刪除。

### 3. deal_attributions（必要但依賴正式 deal）

用途：closed-won 當下 freeze 歸因、deal/commission value。PK UUID；`deal_id unique`; person/property required；first/lead/last touch nullable但品質報表要標示缺失；deal_value/commission_value nonnegative；won_at required。

- RLS: admin/owner read/write via server transition；一般 editor 依業務需求只讀或遮罩金額。
- Index: won_at, property_id, person_id, campaign snapshots。
- Retention: 依財務/交易法規政策，不跟 raw web events 一起 purge。
- Rollback: 不可 cascade erase deal history；修正需 audited supersede/version。

## 延後的 tables

| Table | Phase 1 | 理由 |
|---|---|---|
| analytics_visitors | 延後 | visitor_id 先存 event；避免過早建立 profile/cross-device identity |
| analytics_sessions | 延後或 Phase 1.5 | 可由 events + session id 查；流量/效能證明後再 materialize |
| analytics_attribution_touches | 可選 | 若 lead/deal snapshots 的 touch FK 需要 normalized touch entity再加；第一版可 event FK + snapshot |
| internal_traffic_rules | Phase 1 可小表或 config | 需要可 audit 的 rule；規模很小 |
| analytics_daily_rollups | Phase 2 | Analyze 開發前依資料量建立，避免 raw scan |

## Existing-table extension alternative

在 `inquiries` 直接加 visitor/session/UTM/first touch 欄位，優點是 migration 少、查詢簡單；缺點是多次 inquiry、person merge、last non-direct、歷史 snapshot與資料治理難。建議 inquiries 只新增 linkage 必要欄位（若需要），歸因放 `lead_attributions`。

在 `people` 加 first/last source 只適合「目前摘要 cache」，不能作歷史 truth。`people.source` 應保留操作來源分類，不應重解讀為 campaign attribution。

現有 `analytics_events` 擴充優於另建 v2 table，但要先處理舊 event name check、`created_at→occurred_at/received_at` backfill、metadata allowlist、資料量與未知 Production drift。這代表 **Phase 1 需要 additive migration**，但 Phase 0 不建立 migration。

## Preview/Production isolation

最低要求每 row 有 environment 且 report 強制 production；更佳方案為不同 Supabase project/ingestion key。Preview URL/branch 只能寫 preview。production endpoint 拒絕非 production origin；server lifecycle 依 runtime environment 設值。測試資料不得靠事後 filter 猜測。

## Privacy/data quality constraints

- event_properties 使用 event-specific Zod schema，拒絕未知 key。
- 不存 message、form fields、DOM text、完整 URL query。
- identifier linkage 必須有 provenance、linked_at、linked_by。
- event append-only；更新只允許 data governance job，需 audit。
- daily duplicate/unknown event/preview pollution/missing property/missing attribution checks。
