# Conversion Analytics Phase 1 Performance Review

- Client：單一小型 provider；sendBeacon 優先、fetch keepalive fallback；不阻塞 navigation/CTA，無 recursive retry。
- Event endpoint：8KB hard limit；rate count、rate insert、event insert；duplicate 同路徑安全成功。
- Attribution：visitor/session queries 並行，365-day bounded lookback，limits 500/200；無 N+1 或頁面 render aggregation。
- Homepage reload：20/20 HTTP 200。
- Property reload：20/20 HTTP 200。
- Valid event requests：至少 10；duplicate：5；inquiry：4。
- Error 1102：0；unexpected 404/500：0；request storm：0。
- 新 Cloudflare resource：0。
