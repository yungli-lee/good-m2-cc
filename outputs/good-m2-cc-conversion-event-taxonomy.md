# good-m2-cc Conversion Event Taxonomy

版本：Phase 0 proposal v1。事件名稱與 payload 都必須帶 `event_version=1`。瀏覽器不得產生 CRM lifecycle 或 `deal_won/deal_lost`。

## Producer 信任邊界

- `web_client`：匿名瀏覽與 click；可被偽造，只作行為訊號。
- `public_api`：表單成功落庫後產生 `inquiry_created`；可信度高於 client。
- `crm_server`：已驗證後台 route/action 在成功 transaction 後產生 lifecycle event。
- `system_job`：rollup、資料品質或自動狀態事件。

## 共同欄位

`event_id`（client/server UUID、unique）、`event_name`、`event_version`、`occurred_at`、`received_at`、`visitor_id`、`session_id`、`user_id`、`person_id`、`inquiry_id`、`requirement_id`、`property_id`、`deal_id`、`page_path`、`referrer`、`utm_source`、`utm_medium`、`utm_campaign`、`utm_content`、`utm_term`、`device_class`、`event_properties`、`source_system`、`environment`、`is_bot`、`is_internal`。

規則：UUID/FK 不存在時為 null；`environment ∈ {preview,production,development,test}`；時間以 UTC；path 不存 query 中的敏感值；referrer 只存已截斷 URL；event_properties 必須按事件 allowlist。

## Web events

| event_name | 觸發點 | 必要 context | event_properties allowlist |
|---|---|---|---|
| `page_view` | route 完成可見 | page_path, session | page_type, content_id |
| `view_home_section` | section 首次達可見門檻 | session | section_key, campaign_id |
| `view_property_list` | 公開列表顯示 | session | result_count, page_number |
| `view_property` | 物件 detail 顯示 | property_id | listing_no |
| `view_property_media` | 媒體成 active/lightbox open | property_id | media_id, media_type, action |
| `view_knowledge` | 文章顯示 | content id | slug, category_id |
| `view_calculator` | calculator 顯示 | page_path | calculator_type |
| `search_property` | 搜尋提交 | session | normalized_query, result_count |
| `filter_property` | filter apply | session | filter_keys, result_count（不得存任意文字） |
| `sort_property` | sort apply | session | sort_key |
| `open_map` | Maps CTA | optional property_id | placement |
| `share_property` | 分享 action | property_id | channel |
| `use_calculator` | 成功計算 | session | calculator_type, input_band, result_band（只存區間） |
| `click_cta` | 通用 CTA | context id | cta_id, placement, destination_type |
| `click_line` | LINE click | context id | placement |
| `click_phone` | tel click | context id | placement |
| `start_inquiry` | 使用者開始輸入/聚焦表單 | session | form_type, placement |
| `submit_inquiry` | client 送出 attempt | session | form_type, property_id_present |

## Trusted server events

| event_name | producer | 成功條件 |
|---|---|---|
| `inquiry_created` | public_api | inquiry DB insert 成功；同 transaction/可靠 outbox 後寫 event |
| `person_created` | crm_server | People insert 成功 |
| `requirement_created` | crm_server | requirement insert 成功 |
| `lead_qualified` | crm_server | 人員明確確認 qualified 狀態（需 Phase 1 欄位） |
| `property_linked` | crm_server | active people_properties relation 成功 |
| `showing_scheduled` | crm_server | showing record 建立（現況尚無正式 table） |
| `showing_completed` | crm_server | showing status 確認完成 |
| `offer_created` | crm_server | offer record 成功 |
| `negotiation_started` | crm_server | negotiation 狀態進入 active |
| `deal_won` | crm_server | deal 狀態由授權角色改為 closed_won 且 snapshot 成功 |
| `deal_lost` | crm_server | deal 狀態改為 closed_lost |

## Idempotency 與時序

- 同 `event_id` 重送回 202/200，不新增 row。
- client `occurred_at` 最多允許合理 clock skew；server 設 `received_at`。
- lifecycle event 的 event_id 由 server 以狀態轉換 id/outbox id 產生。
- `submit_inquiry` 是 attempt，不可當 lead；`inquiry_created` 才是成功詢問。

## 禁止欄位

完整 message、姓名、電話、Email、地址、密碼、身分證、信用卡、任意 DOM text、form values、完整 user-agent/IP。IP 只可短期 salted hash 用於 abuse/internal classification，不能作永久 visitor id。

## 既有 taxonomy 對照

`property_view→view_property`、`property_search→search_property`、`knowledge_view→view_knowledge`、`line_click→click_line`、`phone_click→click_phone`、`inquiry_submit→submit_inquiry`、`media_view→view_property_media`。Phase 1 migration 必須明確 version/兼容策略，不能只改 TypeScript constants，因為 DB check constraint 目前也鎖舊名稱。
