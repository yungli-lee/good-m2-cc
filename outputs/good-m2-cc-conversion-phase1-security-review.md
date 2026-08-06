# Conversion Analytics Phase 1 Security Review

- Browser 只能 POST application endpoint；service-role key 僅 server 使用，未回傳 client。
- `rate_limit_events` 明確授予 service_role SELECT/INSERT；anon/authenticated 無新增寫入權。
- Client payload strict；environment/source/received/internal/bot/inquiry identity 由 server 控制。
- 8KB limit、invalid JSON、event-specific schema 與 recursive sensitive-key rejection 已測試。
- SQL evidence：sensitive keys=0；environment isolation PASS；bot/internal eligible rows=0。
- DB error 回安全 code；log 不含表單內容、token、cookie 或完整 Supabase error。
- Invalid analytics payload 回 400，但 inquiry 仍 200，failure containment PASS。
- Exact-ID cleanup：transaction + Preview environment + fixed IDs；無模糊日期或 campaign-wide DELETE。
- Cleanup 前 inquiries=11（E2E 4、original 7）；cleanup 後 E2E events/inquiries/attributions=0，original inquiries=7。
- Two random attribution UUIDs were not retained before verified cleanup; no values were fabricated.
- Production DB：UNTOUCHED；Production deployment：NOT STARTED。
