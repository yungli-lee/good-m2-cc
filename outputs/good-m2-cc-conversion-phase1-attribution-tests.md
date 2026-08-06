# Conversion Analytics Phase 1 Test Plan

## Identity

- 同 storage/environment 的 visitor_id 跨 reload 穩定且為 UUID。
- session 在活動 30 分鐘內穩定；超時建立新 UUID。
- 合法新 campaign landing 建新 session/touch；internal/direct 不覆蓋 first/last non-direct。
- Preview/Production key、cookie與 event environment 隔離。
- cookie/localStorage throw/disabled 時安全降級、無 hydration error。

## API and events

- 每個 Phase 1 allowlisted event v1 可寫；未知 event/version/source key 拒絕。
- body > limit 回 413；invalid JSON/schema回安全錯誤。
- 同 event_id 兩次只一 row；duplicate response不觸發 retry loop。
- event_properties含 name/phone/email/message/token/cookie/dom/html/form_data 拒絕。
- body偽造 source_system/environment 被忽略或拒絕；server設定正確 preview。
- Analytics API 500/timeout不影響頁面 navigation、LINE/tel或 inquiry response。

## UI producer

- LINE/phone一個 click只送一次。
- property/page/knowledge view在 hydration/Strict Mode不重複。
- media activation與lightbox action context一致。
- search/filter/calculator不收原始敏感輸入。
- submit失敗沒有 inquiry_created；成功只有一個 server inquiry_created。

## Attribution fixtures

1. Facebook campaign→property→media→LINE→inquiry：first/lead/last與property正確。
2. 隔日 direct inquiry：first Facebook、lead direct、last non-direct Facebook。
3. first-touch immutable：後續 instagram/google不改 first。
4. 無 events/disabled storage：inquiry成功，status missing，不建立假來源。
5. 部分 session events：partial snapshot，inquiry仍成功。
6. 同 inquiry attribution重跑：inquiry_id unique，不重複且不覆寫 first snapshot。
7. person建立後只補 person_id，不重算 source/time。

## SQL/security

- anon/authenticated不能 insert analytics/lead attribution。
- admin/owner read；editor/viewer依 policy拒絕；service role server path可寫。
- foreign keys、unique、indexes、legacy backfill與 environment counts PASS。
- Preview event不出現在 `environment='production'` query。

## Regression gates

CRM Phase 1/2A、CMS、Media、Inquiry route/form、typecheck、lint、production build、pages build、diff check。Cloudflare Preview另記 CPU duration、1102、payload sizes與重複 network request。
