# Conversion Analytics Phase 1 Event Producers

本文件是 implementation mapping；producer 尚未實作。

| Event | Producer placement | Context/allowlisted properties | Dedup rule |
|---|---|---|---|
| page_view | public route observer once per navigation | page_type, content_id | event_id per route transition |
| view_property | property detail client marker | property_id; title/category/city/district/price/status are server-rendered allowlisted context | once per page navigation |
| view_property_media | PropertyMediaGallery active/lightbox | property_id, media_id, media_type, action | once per activation/action |
| view_knowledge | knowledge detail marker | content_id, slug, category_id | once per navigation |
| search_property | HomePropertySearch + properties form | normalized query/result_count | one submit action |
| filter_property | properties filters | filter_keys/result_count only | one apply/navigation |
| open_map | contact/property map CTA | placement, optional property_id | one click |
| share_property | property share UI（若 Phase 1 加入） | channel, property_id | one click |
| use_calculator | each successful calculate action | calculator_type, input/result bands only | one calculation |
| click_line | delegated/common tracked link helper | cta_location, contact_person, optional property/campaign | one native click; no parent+child double handler |
| click_phone | delegated/common tracked link helper | same | one native click |
| start_inquiry | service form first meaningful focus | form_location, inquiry_type | sessionStorage/in-memory once per form/session |
| submit_inquiry | immediately before POST attempt | property_id, form_location, inquiry_type | one explicit submit attempt |
| inquiry_created | public inquiry route after DB insert | inquiry_id/property/visitor/session/source_page/status | deterministic server event id or stored result; client forbidden |

## Identity helper

Cookie/localStorage key 必須按 environment/host 隔離，例如 `gm2_analytics_v1_preview` 與 production 不共用。visitor UUID proposal expiry 13 months；session record 保存 UUID + last_activity + campaign signature，30 分鐘 inactivity 新建。新合法 campaign landing 建新 session；direct/internal navigation 延續 session且不覆蓋 last non-direct。

SSR 不讀 browser storage；client effect 初始化一次。storage/cookie disabled 時使用 page-lifetime UUID，event 仍可送但 attribution quality 降級，不 throw、不 hydration mismatch、不阻塞 render。

## Privacy rules

Client builder只接受 per-event Zod schema，strip/reject unknown keys。property_title/city 等商業公開資料可送；姓名、電話、Email、message、表單 values、完整 query、DOM text、cookies、token、IP、完整 user-agent禁止。Search query 仍套既有 PII redaction與長度限制。

## Internal/bot

`/admin`, `/api/admin`, health/static paths不啟動 producer。已登入 admin 只能透過非敏感 internal marker 或 server判定標記 `is_internal`；明顯 bot UA標 `is_bot`/拒絕。IP hash只作短期 abuse輔助，不當 visitor identity。
