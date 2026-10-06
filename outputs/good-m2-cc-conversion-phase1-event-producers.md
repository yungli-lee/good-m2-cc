# Conversion Analytics Phase 1 Event Producers

| Event | Producer | Duplicate/failure behavior |
|---|---|---|
| page_view | global public pathname observer | one per pathname; admin/error page excluded |
| view_property | property detail tracker | one per property/navigation |
| view_property_media | property gallery image/video action | only explicit view/play |
| view_knowledge | article detail tracker | one per article/navigation |
| search_property | homepage search submit | one per completed search; result_count only |
| filter_property | common helper/schema ready for settled filter UI | never slider movement |
| open_map | delegated Google Maps link click | click remains native |
| share_property | delegated property share link click | requires property context |
| use_calculator | calculator form submit | no finance inputs/results included |
| click_line/click_phone | global delegated native links | one handler; navigation never awaited |
| start_inquiry | first focus in inquiry form | one per form/session dedupe key |
| submit_inquiry | homepage form after client validation path begins | form metadata only |
| inquiry_created | server after inquiry insert | deterministic event_id=inquiry_id |

All event properties use strict per-event schemas. Unknown keys are rejected. Prohibited: name, phone, email, message, token, cookie, DOM/HTML, full form payload. Public property title/category/price and content slug/category are allowed。

Legacy homepage form consumes only `window.goodM2Analytics.getIdentity()` and `trackEvent()`；it never sends user-entered fields into analytics. Tracking failure is ignored and the original fetch/LINE/tel/navigation continues。
