# Conversion Analytics Phase 1 Performance Review

- Client：單一小型provider及identity/acquisition helper；無analytics SDK、dashboard或aggregation bundle。
- Event endpoint：正常3 DB operations（rate count、rate insert、event insert）；duplicate同路徑，無recursive retry。
- Attribution：existing snapshot check 1；candidate visitor/session queries並行2；snapshot insert 1；status update 1；server event insert 1。Missing path較少。
- Candidate query使用environment + indexed visitor/session + bounded occurred_at，365-day lookback，limits 500/200；無N+1、無全表aggregation。
- Typical payload目標約0.7–1.5KB；hard maximum accepted 8192 bytes，超過回413。
- sendBeacon優先，fetch keepalive fallback；不await navigation/CTA，不在SSR聚合。
- 新Cloudflare resources：0。Recursive retry：0。Error 1102：本機無；需Preview deployment/Worker logs最終確認。
