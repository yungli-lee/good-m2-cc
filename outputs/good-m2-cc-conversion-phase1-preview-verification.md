# Conversion Analytics Phase 1 Preview Verification

狀態：Preview E2E 與 exact-ID cleanup 完成。Production DB 未操作，Production deployment 未開始。

## Preview

- URL：`https://863882c7.good-m2-cc.pages.dev`
- Baseline deployment ID：`863882c7-2f3a-4c40-aaa5-311c72bbb32e`
- Baseline deployed commit：`fd70f789d60c319128f9422c0d847e9372e32a9f`
- Analytics：`POST /api/analytics/events`
- Inquiry：`POST /api/public/inquiries`

## Event journey

Case 1 使用 visitor `20000000-0000-4000-8000-000000000011`、session `30000000-0000-4000-8000-000000000011`、property `7c39368e-984f-478b-8215-2001e892dc2e`、campaign `analytics_phase1_preview_test`：

- page_view：`10000000-0000-4000-8000-000000000011`
- view_property：`10000000-0000-4000-8000-000000000012`
- view_property_media：`10000000-0000-4000-8000-000000000013`
- click_line：`10000000-0000-4000-8000-000000000014`

四筆皆回 202、`duplicate:false`，SQL 顯示 `environment=preview`、`is_bot=false`、`is_internal=false`。Duplicate event `10000000-0000-4000-8000-000000000099` 第一次回 202，後續五次回 200、`duplicate:true`，DB `row_count=1`。

## Inquiry attribution

| Case | Inquiry / inquiry-created event ID | Attribution | Status |
| --- | --- | --- | --- |
| Facebook complete | `65e701ea-9121-4d5a-b94e-96a6deb0532b` | one row confirmed | complete |
| Direct return | `2054b3b4-8662-4af9-9ab0-bb32eee037b8` | one row confirmed | complete |
| Missing identity | `ef6b25f8-d01d-479d-84fa-c9e34ef43f0a` | none by design | missing |
| Invalid analytics isolation | `c001cb95-4410-4275-9180-60df19fa45fe` | none by design | missing |

Complete：first `10000000-0000-4000-8000-000000000021`；lead `10000000-0000-4000-8000-000000000023`；last non-direct `...0023`。Direct return：first 保留 `...0021`；lead direct `10000000-0000-4000-8000-000000000031`；last non-direct 保留 `...0023`。

Two random attribution UUIDs were not retained before verified cleanup; no values were fabricated.

Invalid analytics payload 回 400 `invalid_event`；隨後 inquiry 仍回 200、status missing，證明 analytics failure 不 rollback inquiry。

## SQL and cleanup

- Sensitive keys：0。
- Environment isolation：測試 campaign 只有 Preview rows。
- Cleanup 前 inquiries：11；E2E inquiries：4；original：7。
- Cleanup 後 test analytics events：0。
- Cleanup 後 test inquiries：0。
- Cleanup 後 test lead_attributions：0。
- Cleanup 後 inquiries：7。
- Original 7 preserved：YES。

Verify SQL 為 SELECT-only。Cleanup 使用 transaction、固定 event/inquiry IDs、`environment='preview'`、固定 form type/source path；未使用模糊日期或 campaign-wide DELETE。

## Cloudflare stability

- Homepage reload：20/20 HTTP 200。
- Property reload：20/20 HTTP 200。
- Valid event requests：至少 10。
- Duplicate requests：5。
- Inquiry requests：4。
- Error 1102：0。
- Unexpected 404/500：0。
- Recursive retry/request storm：0。

## Rollback / roll-forward

若 application producer 尚未啟用且 Phase 1 event 為零，可用 Preview rollback。若已有事件，rollback SQL 主動拒絕並採 roll-forward；不得為回退刪除正式事件或 inquiry attribution。Production 維持 untouched，直到獨立 release 核准。
