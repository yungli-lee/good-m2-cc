# Conversion Analytics Phase 1 Tests

Automated `test:analytics-phase1` covers visitor reload, session continuity/timeout, environment isolation, storage-disabled fallback, SSR guard, UTM normalization, internal referrer, valid/invalid event, UUID validation, client-controlled environment rejection, nested sensitive key, unknown property, Facebook first touch, direct lead touch and last non-direct preservation。

Static contract checks cover 8KB endpoint limit, duplicate idempotency, server environment/source, service key non-response, inquiry visitor/session persistence, pending/missing status and rejection of client attribution status。

Preview E2E required：

1. Facebook campaign→property→LINE→inquiry：complete，same property/session/campaign。
2. Direct return：first Facebook，lead direct，last Facebook。
3. Fresh context/no events：inquiry success + missing，no false snapshot。
4. Event endpoint failure：UI/LINE/phone/inquiry unaffected。
5. Duplicate event/inquiry attribution：single rows and immutable first touch。

Read-only evidence SQL：`scripts/sql/conversion-analytics-phase1-e2e-verify.sql`。Cleanup要求人工填入精確event/inquiry UUID；placeholder未替換會abort，且只允許Preview environment/test timestamp。
