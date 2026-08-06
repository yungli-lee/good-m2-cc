# Conversion Analytics Phase 1 Security Review

- Browser只能POST application endpoint；anon/authenticated無analytics direct insert grant。
- Supabase service-role只由server module讀取，不在client import graph或response。
- Client payload strict；environment/source/received/internal/bot/person/inquiry/requirement server-controlled。
- 8KB limit在JSON parse前檢查actual bytes；invalid JSON 400；oversize 413；rate limit 429。
- Event-specific schema拒絕unknown keys；recursive sensitive-key scan拒絕PII/token/cookie/DOM/HTML/form_data。
- IP只做HMAC rate-limit key，不是visitor identity，也不進public analytics payload。
- DB error只回安全code；structured logs不含表單內容、token、cookie或完整Supabase error。
- Admin/API/error paths不產生public page view；bot UA標記後排除歸因。
- Inquiry attribution failure不影響主 inquiry，immutable snapshot由unique constraint及trigger保護。
