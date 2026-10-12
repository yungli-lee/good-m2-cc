# 銷售 LINE 通知：第二階段正式啟用

2026-10-12：第一階段 PR #48/#49 已合併，手機後台操作由阿勇確認正常。本階段準備正式 Webhook / Cron / 啟用時間；程式修改不代表通知已開啟。正式設定與端到端送達驗證仍須完成。

## 路由與資料庫

| 環境 | 網站 | Supabase | 用途 |
| --- | --- | --- | --- |
| Production | `https://good.m2.cc` | `rlbuadkmylulieoryzal` | 正式帳號綁定與提醒 |
| Preview | `https://feature-sales-dual-track-pha.good-m2-cc.pages.dev` 或其他此專案 Preview | `niorteztdbuyusemsgwa` | 測試綁定與提醒 |

兩個 API 都檢查精確的網站／資料庫組合。正式站未明確設 `SALES_LINE_ENVIRONMENT=production` 會拒絕執行。不同 `SUPABASE_URL` 與 `NEXT_PUBLIC_SUPABASE_URL` 也會拒絕執行。Preview 未設環境名稱時維持既有 Preview 行為。`/admin/sales-tasks` 的立即測試通知仍僅供 Preview。

## Cloudflare Pages：Production 設定

| 名稱 | 值／注意事項 |
| --- | --- |
| `SALES_LINE_ENVIRONMENT` | `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rlbuadkmylulieoryzal.supabase.co` |
| `SUPABASE_URL`（若有） | 同正式資料庫；不要指向 Staging |
| `SUPABASE_SERVICE_ROLE_KEY` | 正式專案現有 server secret，禁止放入公開 vars／repo |
| `SALES_LINE_BINDING_ENABLED` | 綁定驗證時設 `true` |
| `LINE_MESSAGING_CHANNEL_SECRET` | 正式 LINE channel secret，secret 儲存 |
| `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` | 同一正式 LINE channel 的 token，secret 儲存 |
| `SALES_LINE_CRON_SECRET` | 正式排程專用隨機 secret，與正式 Worker 一致；不得沿用 Preview secret |
| `SALES_LINE_REMINDERS_START_AT` | 實際啟用時選定的 ISO 時間，包含時區，例如 `2026-10-12T10:30:00+08:00`；此值只示範，不要直接照填 |
| `SALES_LINE_REMINDERS_ENABLED` | 初始 `false`；綁定與排程驗證完成後才改 `true` |

不可在這份文件、chat 或 repo 填入實際 secret。僅用 Cloudflare 的 secret 欄位。Production 與 Preview 各自維護設定，資料與綁定不複製。正式啟用時間不是 build 時間；舊的逾期任務不會自動補送。

## LINE Webhook

正式 URL：`https://good.m2.cc/api/line/sales-binding-webhook`。

若 LINE Verify 只顯示 503，可在瀏覽器開啟同一 URL，以 GET 讀取不含密鑰的即時設定狀態：`disabled` 是正式綁定開關未讀到 `true`；`not_configured` 是讀不到 Channel secret；`environment_mismatch` 是網站／資料庫／環境不匹配；`configuration_ready` 僅代表開關與 secret 已讀到，仍須 LINE Verify 驗證簽章。GET 不查詢資料庫、不綁定帳號、不發送訊息、不回傳 secret，並停用快取。

先部署程式與 Pages 設定，再在 LINE Developers 設 Webhook URL、按 Verify，成功後開啟 Use webhook。每個 LINE channel 只有一個 Webhook URL；若目前 Preview 使用同一 channel，切到正式 URL 後 Preview 的自助綁定不能同時接收該 channel 事件。Preview 提醒 Worker 與既有測試綁定仍可繼續；需要持續測試自助綁定時使用獨立測試 channel，不可把正式綁定寫進 Staging。

正式帳號應從正式後台重新產生綁定碼，並由該人自己的 LINE 傳送；驗證後台顯示已綁定。不要把 Editor B 的測試 LINE 身分直接複製到正式資料庫。

## 正式 Cron Worker

程式：`workers/sales-reminder-cron/index.ts`；設定：同資料夾 `wrangler.toml`。正式 Worker 名稱 `good-m2-sales-reminders-production`，無 HTTP 入口，不存 Supabase 或 LINE token，只呼叫正式提醒 endpoint。不要修改原本的 Preview Worker。

設定中預設 `SALES_LINE_CRON_ENABLED=false`、`crons=[]`。使用 Cloudflare 現有 Workers 方案；部署後先保留此停用狀態。

在正式 Worker 的 secret 設定 `SALES_LINE_CRON_SECRET`，與 Pages Production 相同。準備啟用時將正式設定改成 `SALES_LINE_CRON_ENABLED="true"`、`crons=["* * * * *"]`，每分鐘檢查到期任務。兩項同時滿足才會呼叫 Pages。若使用 Wrangler，應以此設定為來源，避免下一次部署覆蓋 dashboard 改動。

CLI 範例（先檢查本機 Wrangler 版本與 `--help`，不把 secret 值寫在命令列）：

```bash
pnpm exec wrangler secret put SALES_LINE_CRON_SECRET --config workers/sales-reminder-cron/wrangler.toml
pnpm exec wrangler deploy --config workers/sales-reminder-cron/wrangler.toml
```

這份修改不會自動部署或替你開啟 Cron。Cron 變更最多約 15 分鐘才傳播；跟進日期／時間以台北時間呈現。

## 啟用驗證順序

1. Pages 程式、正式資料庫 migration、正式 environment 配對正確；未授權提醒呼叫回 401，未簽名 Webhook 回 401。
2. 正式 LINE Verify 通過；阿勇／阿美各自完成正式帳號綁定，指派任務只送給負責人。
3. 設實際 `SALES_LINE_REMINDERS_START_AT`，再開 Pages 提醒與正式 Worker；只保留一個正式 Cron。
4. 用正式後台建立明確的測試任務，時間晚於啟用時間：到期只送一次、連結回正式站、備註正確。再確認完成／取消後不送、改期按新時間送；Preview 測試不讀寫正式任務。
5. Workers logs 查看 `claimed/sent`；失敗批次會標示錯誤，可從任務的 `line_reminder_last_error` 查。不要輸出收件人 LINE ID、secret 或客戶備註到 logs。

DB claim 保留既有防重複機制，另加固定 LINE `X-Line-Retry-Key`（任務＋到期時間＋環境）。相同提醒的網路重試維持相同 key；LINE 返回已接受的 409 視為已接受。LINE retry key 有效期為 24 小時，既有最多 3 次／10 分鐘重試不保證最終送達；發送期間修改備註／負責人也無法回收已接受的通知，應改期建立新的提醒時點。

## 停用／回退

先將 Pages Production `SALES_LINE_REMINDERS_ENABLED=false`，再將正式 Worker 停用並移除 Cron。綁定若需要停用，設 `SALES_LINE_BINDING_ENABLED=false`。不要刪除任務與綁定資料；不改既有 Preview Worker。程式回退至 PR #49 的 `99dff97` 會恢復 Preview-only 端點。

參考：Cloudflare [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)、LINE [Webhook signature](https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/)、[Retry requests](https://developers.line.biz/en/docs/messaging-api/retrying-api-request)。
