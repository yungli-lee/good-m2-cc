# Conversion Analytics Phase 1 Attribution Tests

Automated coverage 包含 visitor reload、session continuity/timeout、environment isolation、storage-disabled fallback、SSR guard、UTM normalization、internal referrer、valid/invalid event、UUID validation、nested sensitive key、Facebook first touch、direct lead touch、last non-direct preservation、duplicate idempotency 與 inquiry failure containment。

## Preview E2E

1. Complete `65e701ea-9121-4d5a-b94e-96a6deb0532b`：first `...0021`、lead/last non-direct `...0023`、status complete。
2. Direct `2054b3b4-8662-4af9-9ab0-bb32eee037b8`：first 保留 `...0021`、lead direct `...0031`、last non-direct 保留 `...0023`、status complete。
3. Missing `ef6b25f8-d01d-479d-84fa-c9e34ef43f0a`：status missing、無錯誤 snapshot。
4. Failure isolation `c001cb95-4410-4275-9180-60df19fa45fe`：invalid event 400、inquiry 200/status missing。
5. Duplicate `10000000-0000-4000-8000-000000000099`：首次 202，五次 duplicate 200，DB row_count=1。

Complete/direct 各有且僅有一筆 attribution row。Two random attribution UUIDs were not retained before verified cleanup; no values were fabricated.

Cleanup 後 test events=0、test inquiries=0、test attributions=0、original inquiries=7。
