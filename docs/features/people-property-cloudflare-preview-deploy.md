# Cloudflare Pages Preview 人工部署步驟

1. 確認 `feature/crm-people-property-relation` 已推送，並記錄 branch HEAD。
2. 在 Cloudflare Pages `good-m2-cc` 建立該 branch 的 Preview deployment。
3. Preview environment 只設定 Preview Supabase URL、anon key 與 Preview 專用 server secrets；不可把 Production service role key 複製到 Preview。
4. 在 deployment details 記錄 Preview URL、Deployment ID、commit SHA、build status 與 build log 摘要。
5. 從 Preview runtime／部署設定核對 Supabase URL 的 project ref，必須為 Preview ref，且與 Production `rlbuadkmylulieoryzal` 不同。
6. 只有完成上述身分核對後，才可在 Preview SQL Editor 依序執行 identity → precheck → migrate → verify → behavior test → cleanup。

不得修改 Production environment variables、不得由 Preview branch 觸發 Production deployment。若 URL、project ref、environment 或 deployed commit 任一項未知，停止並標記 `BLOCKED_BY_PREVIEW_DATABASE_IDENTITY`。
