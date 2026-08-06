# Conversion Analytics Phase 1 Implementation Plan

狀態：Schema approval stop。尚未套 Preview migration、未建立 endpoint、未加入 client producer、未操作 Production DB。

## Scope

Phase 1 串接 `visitor → session → campaign → event → inquiry → lead attribution`。不包含 deals、closed-won、帶看、出價、議價、成交價、服務費、完整 Analyze dashboard、Ads API 或 AI。

## Implementation sequence after Preview migration approval

1. 人工在 Preview 執行 `202608060101_conversion_analytics_phase1.sql`。
2. 執行 read-only verify SQL；確認 schema、indexes、RLS/grants、舊事件與 inquiries 無遺失。
3. 建立 `lib/analytics/identity.ts`：SSR-safe visitor/session/UTM state，storage failure fallback。
4. 建立共用 client emitter：Zod allowlist、sendBeacon、keepalive fallback、no retry loop。
5. 建立 `POST /api/analytics/events` Edge route：content-length/body limit、origin/environment、bot/internal classification、service-role server insert、unique event id handling。
6. 分批接 producer：page/property/knowledge → media/search/filter/map/share/calculator → LINE/phone/inquiry intent。
7. 擴充 public inquiry payload，只接受 visitor/session UUID，不接受 client-trusted UTM snapshot；inquiry insert 成功後由 server 查 ledger、建立 lead_attribution 與 inquiry_created。
8. Analytics/attribution 失敗只更新 `inquiries.attribution_status`，不回滾 inquiry，不造成前台 500。
9. 加入 tests 與 SQL verification；只有 Preview E2E PASS 後才 commit/push/deploy Preview。

## API contract proposal

Endpoint：`POST /api/analytics/events`，`runtime="edge"`。單次第一版只接受一個 event，建議 body ≤ 8KB；後續批次需另行壓測。成功 insert 202；duplicate event_id 200/202 且 `duplicate:true`；validation 400/422；oversize 413；rate-limit 429；安全 500。response 不回 DB error、cookie、token 或完整 payload。

允許 source_system：public client 固定 `web_client`，不能由 body 覆蓋。environment 由可信 runtime (`CF_PAGES_BRANCH`/production host) 決定，不能信任 client。`inquiry_created` 不在 public allowlist，只能由 public inquiry server path 呼叫 internal repository helper。

Abuse protection沿用既有 `rate_limit_events` 與 salted `ip_hash` 做短期 request bucket；不把 IP 當 visitor identity。明顯 bot UA由 server設 `is_bot`，管理員 session設 `is_internal`。client不能自行把事件標成 eligible。rate-limit與analytics失敗都不能影響原 CTA/navigation。

## Inquiry reliability

在 inquiry insert 時保存 visitor_id/session_id 並設 pending；主資料成功後 attribution 最佳努力執行。完整 snapshot 成功→complete；有 session 但 touch 不完整→partial；無 identifier/events→missing；資料庫/analytics 暫時錯誤→failed。重試以 inquiry_id unique upsert/do-nothing 保證不重複。

## Attribution algorithm

同一 database operation context 取得 inquiry 的 visitor/session/environment/inquiry_at，所有候選事件固定條件：同 environment、`occurred_at <= inquiry_at`、`is_bot=false`、`is_internal=false`。不得查全表。

1. first-touch：以 visitor_id + visitor/time index 取最早 acquisition/page event；若 UTM 無效，使用 normalized referrer/direct。寫入後不再重算。
2. lead-touch：以 inquiry session_id 取該 session 的 landing/acquisition touch；沒有 UTM 時允許 direct。
3. last non-direct：以 visitor_id 反向取 inquiry_at 以前最後一個 source 非 direct 的有效 touch；不存在則 null，不拿 direct 假冒。
4. `insert lead_attributions ... on conflict (inquiry_id) do nothing`，保存 event FK及 source snapshot。
5. 以 deterministic UUID（由 application持久產生並復用）寫 `inquiry_created`；event_id unique使重送不重複。
6. 成功才把 inquiry status標 complete/partial；任何 analytics error只標 failed/missing並回 inquiry success。

## No new Cloudflare resources

使用現有 Cloudflare Pages/Worker 與 Supabase；不建立 KV、D1、Queues、Durable Objects 或 Analytics Engine。若單請求可靠性不足，outbox/Queue 是後續獨立提案，不在本階段默默增加。
