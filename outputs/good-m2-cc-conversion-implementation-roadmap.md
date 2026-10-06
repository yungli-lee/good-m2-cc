# good-m2-cc Conversion Analytics Implementation Roadmap

## Phase 0（本次）

只讀 baseline、taxonomy、attribution、CRM lifecycle、data model、dashboard IA、驗收與風險。無 migration、endpoint、tracking、dashboard、DB/deploy。

## Phase 1A：Schema + ingestion foundation

1. Preview/Production read-only precheck：analytics schema、row count、constraints、RLS/grants、migration ledger。
2. 提交最小 additive migration 草案：擴充 analytics_events、lead_attributions；deal_attributions 可在 deal model 明確時一起或後續。
3. `/api/public/analytics` Edge route：POST batch、payload/key/size limit、origin/environment、event schema、idempotency、rate limiting。
4. first-party visitor/session/UTM module；internal navigation 不覆蓋 attribution。
5. privacy notice/consent/retention 決策，Preview-only migration 需使用者批准。

Acceptance：重送 event_id 不重複；Preview 不進 production；unknown keys/PII rejected；endpoint 不回 token/raw DB error；page render 不等待 analytics。

## Phase 1B：Web producer

依風險分批：page/property/knowledge → search/filter/media → CTA/LINE/phone → inquiry start/submit。使用 `navigator.sendBeacon` 或 `keepalive` non-blocking fetch，失敗不得阻塞 UX。每個 component 僅一個 producer，防 duplicate React effect。

Acceptance：Facebook→property→media→LINE journey 可重建；初始頁面沒有 blocking request；payload/volume/performance evidence PASS。

## Phase 1C：Inquiry/CRM linkage

public inquiry insert 成功後 server 產生 `inquiry_created` 並建立 lead attribution；新增明確 inquiry→person/requirement linkage workflow。People 建立不自動等於 qualified；由授權人員確認 qualification。

Acceptance：隔日 direct inquiry 保留 first Facebook/lead direct/last non-direct Facebook；person/requirement linkage 有 actor/time/provenance。

## Phase 1D：Transaction lifecycle

先設計正式 showing/offer/deal state model，再實作 server lifecycle events。property timeline 可保留為 UI history，但不作 truth。`deal_won` 與 `deal_attributions` snapshot 必須同一可靠 transaction/outbox 邊界。

Acceptance：showing→offer→negotiation→won/lost 有合法 transition；browser 無法偽造；修改 People 不改歷史 snapshot。

## Phase 2：Analyze + rollups

建立 daily rollups/data quality jobs、`/admin/analyze` IA、權限與金額遮罩。報表固定 semantic definitions，帶 freshness/model/timezone。

## UTM/operations

後台提供追蹤 URL builder、copy link、QR campaign；source/medium select allowlist；campaign 建議 listing_no/property id；content 表示素材/placement。建立 internal traffic rule 管理與 audit。

## Privacy/retention plan

- Raw anonymous events 13 個月 proposal；IP abuse hash 7–30 日；CRM/deal 依營運與法規另訂。
- 提供 visitor identifier reset/erasure workflow，已匿名 aggregate 不需反向識別。
- 日誌不可包含 payload、token、cookie、完整 Supabase error、客戶訊息。
- access：analytics raw data admin/owner；CRM scoped；commission 另限權限。

## Cloudflare performance plan

- Edge ingestion 單筆/批次硬上限（例如 16KB/20 events，實作前壓測決定）。
- 不在 Server Component render 同步寫事件；client fire-and-forget。
- Analytics insert 不連鎖多 query；linkage/server lifecycle 可用 transaction/outbox。
- Analyze 不 raw scan；所有 query 有時間範圍、index、pagination。
- Preview load test、CPU duration、1102、duplicate requests、cache behavior 為 release gate。

## Required test plan

1. taxonomy Zod allowlist、未知 key/事件/version reject。
2. UTM normalize、direct/referral/organic、internal navigation persistence。
3. event idempotency、batch partial/atomic policy。
4. environment isolation、bot/internal exclusion。
5. inquiry created 與 attribution linkage；重複 submit policy。
6. CRM transition producer trust；client cannot send deal_won。
7. immutable deal snapshot。
8. metric denominator fixtures與pagination totals。
9. beacon/fetch failure 不影響 navigation/form；Cloudflare CPU/1102 smoke。

## Release gates for each implementation phase

Schema precheck → Preview migration by approved operator → verify RLS/grants/data → typecheck/lint/tests/build/pages:build/diff → Preview evidence → production read-only precheck → user-run migration → verify → merge/push approval → production smoke.任何 schema drift、privacy 未決、deal source 不可信都必須停止。
