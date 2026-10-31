# Facebook 粉專直接發布｜第一關整合規格

範圍：只支援經 Facebook Login 授權、目前使用者具 CREATE_CONTENT 權限的 Facebook Page。不支援個人動態、Facebook Groups、Marketplace 自動發文。

## Meta setup (required before live test)
1. 使用者到 https://developers.facebook.com/apps/ 建立或選擇 Meta App。
2. 啟用適用的 Facebook Login 產品與 Pages API；核對目前 App 類型與登入設定。
3. 配置 HTTPS Valid OAuth Redirect URI（採用本專案固定 callback）；針對 staging 與 production 分開管理 callback 與密鑰。
4. 申請必要權限：pages_show_list、pages_read_engagement、pages_manage_posts。是否需要 App Review / Advanced Access 由使用者、App roles 與使用情境決定。
5. App ID 可由設定提供；App Secret 僅透過 Cloudflare server-side secret，禁止提交到 GitHub、前端、客戶端日誌或聊天。

## Server integration plan
- OAuth 啟動：僅登入 editor/admin/owner 可操作。產生不可預測的 state，設置 Secure/HttpOnly/SameSite=Lax cookie，綁定當前使用者和短效期限；redirect 到 Meta OAuth consent。
- OAuth callback：必須核對 state、登入者及 code，僅由伺服器交換 token；對 redirect URI 精確比對；拒絕 CSRF/replay。回調失敗不得顯示 token。
- 列出粉專：使用已授權的 user token 查 /me/accounts；僅顯示具有 CREATE_CONTENT 任務的粉專。Page token 僅保存於受保護的伺服器儲存區，需加密並限制存取。
- 發文：用 Page token 呼叫 Graph API POST /{page-id}/feed（純文字/連結）；照片用 /{page-id}/photos；影片等穩定後再加。不可從使用者輸入中信任任意 Page ID。
- 發布按鈕：需明確選粉專、檢視內容、按確認；不可把草稿儲存等同 Facebook 發布。
- 發文結果：每次發文記錄 creator_id、social_post_id、page_id、Facebook post id/permalink、狀態、時間、錯誤碼（不記 token）；每個目的地獨立記錄，防止重複。
- 重試：超時時先查核是否已發布，避免重複貼文；支援安全的人工作業與重新授權提示。
- 資料存取：使用 Supabase RLS；token 不可供 anon、瀏覽器、一般後台查詢，不使用 auth user_metadata 做授權。
- 開關：預設停用 Facebook 實際發布，僅在 staging 使用測試粉專測試完成後由管理者啟用，Production 必須獨立授權。
- 版控與部署：功能獨立 PR，絕不直接修改 main/Production；不碰實價登錄與其自動化。
- 隱私：明確顯示連接哪些粉專、可撤銷連接、刪除授權 token；不代替使用者自動公開發文。

## Acceptance tests
1. 未登入/權限不足無法進入 OAuth 與發布端點。
2. state 錯誤、逾時、重送、跨帳號 callback 全部拒絕。
3. 已授權粉專正確列出；沒有 CREATE_CONTENT 的粉專不得發布。
4. 一篇純文字測試貼文成功發布到指定測試粉專，記錄貼文 ID/連結；錯誤情況清楚回報。
5. 同一草稿重送不會造成意外重複；撤銷連接後無法發布。
6. CI build/typecheck、RLS 審核及測試粉專人工驗證都通過，才可合併。

參考：https://developers.facebook.com/documentation/pages-api/posts
