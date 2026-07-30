# CRM Phase 1：People–Property Preview Release Candidate

## Scope

`202607290101_people_properties.sql` 建立 People 與 Property 多對多關聯。關聯支援 `owner`、`buyer`、`viewer`、`negotiator`、`tenant`、`landlord`、`referrer`、`contact`、`other`；active 關係由 partial unique index 防止重複，封存資料保留為歷史。

## 實際角色模型

專案目前只有 `owner`、`admin`、`editor`、`viewer`；`manager`／`agent` **NOT_IMPLEMENTED**，本階段不新增或假設這兩個角色。

| 角色 | read | create | update | archive | scope |
|---|---|---|---|---|---|
| owner | PASS | PASS | PASS | PASS | 全域 |
| admin | PASS | PASS | PASS | PASS | 全域 |
| editor | PASS | PASS | PASS | PASS | `EDITOR_SCOPE = GLOBAL_EDITOR` |
| viewer | PASS* | DENY | DENY | DENY | *目前頁面沿用既有後台 guard；若該 viewer 無法進入後台，需由 Preview 手動驗證 read policy |
| manager | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | 不納入驗收 |
| agent | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | 無可靠 ownership model |

Editor 尚無 People owner、Property owner 或 relation ownership 欄位，因此不能宣稱 ownership isolation；editor 可操作所有關聯是已知限制。

## Schema／RLS

Table 為 `public.people_properties`，包含 `person_id`／`property_id` FK、`relationship_type`、`relationship_label`、`note`、`status`、`started_at`、`ended_at`、`created_by`、timestamps 與 `archived_at`。`ended_at >= started_at`、active/archived consistency 與 relationship type check 由 constraint 保護；active partial unique index 防重複。updated_at trigger、authenticated grants 與 staff RLS policy 由 migration 建立。尚未在 Preview 執行 precheck/migration/verify，因此 RLS 實際證據仍待部署環境補齊。

## API／Server actions

共用 `lib/people-properties.ts` validation/query；People 端使用 `app/admin/people/property-actions.ts`，Property 端使用 `app/admin/properties/relation-actions.ts`。create、update、archive 均透過 `requireRole(["editor", "admin", "owner"])`；update 僅修改關係欄位，不接受 person/property/created 欄位；archive 使用獨立 action，不透過 edit form 改 status。duplicate、invalid payload 與 date range 會映射為可理解的頁面錯誤。

`relationship_type = other` 時必須填 `relationship_label`；非 other 會拒絕殘留自訂名稱；結束日早於開始日會拒絕。

## UI／雙向流程

- People 詳情頁：active 關聯列表、新增、編輯、封存與 property 連結。
- Property 編輯頁：active People 列表、新增、編輯、封存與 People 連結。
- 兩端使用相同 relation id 與 service/schema；成功後雙方 path revalidate。
- active 清單預設排除 archived；archive 後可於歷史查詢，並可重新建立相同 active relation。

## Tests

`npm run test:people-property-relation` 覆蓋 schema valid/invalid relationship、other label、UUID、日期區間與 relationship type；RLS、duplicate/archive DB 行為仍需 Preview 實機驗證。既有 timeline/export/parser regression 亦須通過。

## Preview evidence

- Preview project：待取得（不得以 Production ref 代替）
- Migration execution：PENDING
- Schema/RLS/index/trigger evidence：PENDING
- Deployment URL/ID/commit：PENDING
- People→Property E2E：PENDING
- Property→People E2E：PENDING
- role E2E：PENDING；viewer read policy 與 editor global scope 需人工確認

## Known limitations／Production gate

1. 沒有 agent ownership model；不可將 editor 限制描述為「自己負責」。
2. manager/agent 尚未實作。
3. RLS policy 目前以 staff role helper 為基礎；若 server 使用 service role，必須保留 server action role guard。
4. 本分支尚未執行 Preview migration、Cloudflare Preview deployment 或 E2E，因此不能宣稱 `PEOPLE_PROPERTY_PREVIEW_READY`。
5. Production migration、merge main、Production deploy 均必須另行授權，且不在本階段執行。
