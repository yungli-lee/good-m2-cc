# Conversion Analytics Phase 1 Implementation

狀態：Application implementation complete；Preview schema已由使用者執行並 verify。Production DB untouched。

## Identity and acquisition

Visitor使用 environment-scoped first-party localStorage UUID，保存365天；Session使用UUID與lastActiveAt，30分鐘無活動後輪替。SSR不讀window，storage throw/disabled時退回page-lifetime memory，不阻塞render。Preview與Production使用不同key。

Acquisition只保存normalized UTM、external referrer、pathname landing與optional property UUID。first touch固定；session landing每個session固定；direct/internal navigation不覆蓋last non-direct。不保存完整query、cookie、token或IP identity。

## Event delivery and endpoint

Client共用`trackEvent`，自動附event UUID、v1、occurred time、identity、path、acquisition與device。傳送順序sendBeacon→fetch keepalive；任一失敗都被contain，無retry loop。

`POST /api/analytics/events`為Edge Route Handler。Request strict Zod schema、event-specific properties、nested sensitive-key rejection、8KB body limit。environment/source/received/bot/internal完全由server設定。沿用`rate_limit_events`與salted IP hash，60 requests/minute。duplicate event_id回200 duplicate success；正常insert回202。

## Inquiry reliability

Public inquiry只接受optional visitor/session UUID，不接受client attribution status/snapshot。完整identity初始pending；缺少identity為missing。Inquiry insert成功後，Edge request以可控await執行attribution；service內所有failure都contain並標failed，因此不回滾inquiry。Server以inquiry UUID作deterministic inquiry_created event_id，重跑不重複。

## Attribution

候選event固定environment、bot=false、internal=false、365-day bounded lookback及`occurred_at <= inquiry_at`。visitor與session各一個indexed query，分別limit 500/200。

- First：visitor內最早non-direct；沒有non-direct才用最早direct。
- Lead：inquiry session最早有效event。
- Last non-direct：inquiry以前最後一個non-direct。
- 無identity/event：missing且不建立假snapshot。
- visitor有event但session不足：partial。
- DB/service failure：failed，structured log只有inquiry UUID與安全reason。
- inquiry_id unique與immutable DB trigger保護snapshot。

不建立KV、D1、Queue、Durable Object、dashboard、deals或Production resource。
