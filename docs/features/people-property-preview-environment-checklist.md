# People–Property Preview 環境身分查核

## 已盤點的 repository 證據

- `.env.example` 只列變數名稱，不含 project ref 或 secrets。
- `wrangler.toml` 明確分開 `[env.preview.vars]` 與 `[env.production.vars]`：Preview URL 為 `https://niorteztdbuyusemsgwa.supabase.co`，Production URL 為 `https://rlbuadkmylulieoryzal.supabase.co`。
- `docs/RELEASE_FLOW.md` 要求 staging/production 使用不同 Supabase project，並提醒不得以 Production DB 驗證高風險後台功能。
- Repository 沒有 `.github/workflows` 或 Supabase Branching 設定可證明 branch database；目前模式判定為「獨立 Preview Supabase project」，不是 Supabase Branching。
- Cloudflare Pages 實際 environment、deployment URL、commit 與 secret binding 仍須由使用者 Dashboard 確認；`wrangler.toml` 不足以證明已部署版本採用該設定。

## 使用者需提供的 Supabase 證據

- Organization、Project name、Project ref、Branch（如有）、database host、Environment label。
- SQL Editor 顯示的 project ref／host（截圖可遮蔽帳號與 secrets）。
- `NEXT_PUBLIC_SUPABASE_URL` 所屬 project ref、anon key 所屬 project ref、service role key 所屬 project ref（只核對 ref，不提供 key）。
- migration ledger 最新版本。

## 使用者需提供的 Cloudflare 證據

- Pages project、Environment=Preview、Git branch、Preview URL、Deployment ID、deployed commit。
- Preview environment 的 Supabase URL、Supabase project ref（secret 值不可截圖）。

## 安全判定

只有 SQL Editor 顯示的 Preview project ref 與 Cloudflare Preview runtime Supabase ref 都是 `niorteztdbuyusemsgwa`，且與 Production `rlbuadkmylulieoryzal` 不同，才可執行 migration。若兩者不同、未知或共用 Production，停止並標記 `BLOCKED_BY_PREVIEW_DATABASE_IDENTITY` 或 `BLOCKED_BY_UNSAFE_SHARED_DATABASE`。
