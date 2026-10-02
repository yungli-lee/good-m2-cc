# 阿勇阿美需求導覽第一版

入口 `/guide`；公開頁左下角有導覽連結。預設阿美，角色切換會顯示對應單人人像。

## 客人流程

1. 輸入找物件、承租、委託出售/出租或購屋問題。
2. 整理地區、類型、預算與必要條件。買方即時查詢公開在售物件並提供可分享搜尋連結。
3. 孝親房、電梯等必要條件目前不做自動查核，候選卡片清楚提示待真人確認。租屋不使用出售價格推薦。
4. 客人自行開啟需求表單、修改摘要，填稱呼/手機/方便聯絡時間並同意用途，再送出。
5. 沿用 inquiries 後台及既有 Resend 通知；依 API email_sent 區分已寄通知和僅保存成功。不會因為聊天自動通知或承諾真人已接洽。

## 設定與啟用

Cloudflare Preview 先設定 server-only Secret `OPENAI_API_KEY`。模型設定 `CONCIERGE_AI_MODEL` 可用 Secret，預設固定快照 `gpt-4.1-mini-2025-04-14`。程式使用 OpenAI Responses API JSON mode，store=false、20 秒逾時、每次模型最多 900 output tokens；需求提取與資料回答各一次。需可用 API 帳務額度，ChatGPT 帳號不能代替 API 金鑰。

未設定金鑰或模型失敗時明確使用「需求導覽」模式；不宣稱 AI 問答完成。可試搜尋、委託表單及接手流程。AI 自由問答仍須設定後真實驗收。

語音沿用 Azure Speech `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION`。只有伺服器整理過的回覆有 HMAC 簽章 token，可播放 10 分鐘；客戶不能指定任意文字或 voice。阿勇 YunJhe，阿美 HsiaoChen，按需播放，角色切換/提問/頁面隱藏/離开會停止。

若啟用 Turnstile，設定 `NEXT_PUBLIC_TURNSTILE_SITE_KEY` 與 `TURNSTILE_SECRET_KEY`；導覽表單會顯示驗證。通知沿用 INQUIRY_NOTIFY_EMAIL 或 CONTACT_NOTIFY_TO；使用既有固定通知對象，不讓公開客人決定收件者。

## 資料及限制

聊天只讀公開 properties/current knowledge；不使用 service-role，不傳私密物件欄位或聯絡表單到模型。聊天文字中電話與 Email 會先遮蔽；不要在聊天輸入其他個資。對話暫存在頁面記憶體，重新整理即清除；只有确认送出的摘要與點閱物件存入既有詢問單。

AI 回答使用公開資料與知識摘要，可能不完整，底價、屋況、貸款、稅務及法律個案應轉真人。語音不是動畫嘴型或真人電話。

Preview 有每 isolate 每來源 12 次/分鐘、4 個同時處理及有限記憶體保護；這不是全站費用上限。正式啟用 AI 前在 Cloudflare 加全域 WAF rate rule（涵蓋 `/api/public/concierge` 與 `/api/public/concierge/audio`），設定模型專案額度/警示，再實測。未設定 OPENAI_API_KEY 不產生模型費用。語音使用短期 edge cache；不同 isolate 初次同內容可能重複合成。

通知失敗時詢問單仍保存，API 回應與畫面會告知通知未寄；後台可接手。既有通知收件設定目前為單一設定值，不新增 LINE 推播整合或私人收件者。

## 驗證

`pnpm test:concierge`：多條件與跨輪條件、買賣租分流、schema、隱私遮蔽、audio token 簽章/篡改/過期/長度、併發 guard、API 公開投影/搜尋參數/查詢失敗/跨站/provider fallback/真實連結。

另外執行 typecheck、lint、既有角色導覽與搜尋測試、Cloudflare Preview build。Staging 只讀查詢驗證 current knowledge 與鹿港/福興住宅800萬以下的公開篩選；零符合時不應捏造推薦。

尚需 Preview UI、真實模型與 Azure 回覆音訊、測試詢問單送出/後台讀取/通知（需使用者指定測試資料與收件確認）驗收。此次沒有新增 schema 或修改 Production，PR 先保留草稿。
