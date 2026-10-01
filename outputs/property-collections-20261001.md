# 物件分享主題

## 使用方式

在後台導覽或後台首頁選擇「物件分享主題」→「新增分享主題」。

1. 填寫標題、介紹與固定網址名稱（小寫英文、數字、連字號）。
2. 選擇地區、物件類型、最低／最高總價（萬元），必要時加入關鍵字。
3. 上傳專屬封面。JPEG／PNG／WebP、5MB內；自動置中裁切為1200×630 RGB JPEG。未設定封面時沿用首頁社群分享圖。
4. 按「預覽封面與符合物件」查看目前表單的分享卡與搜尋結果。
5. 先儲存草稿，或選擇「已發布」後儲存。
6. 已發布主題可複製固定連結，或分享至 Facebook／LINE。修改後須先儲存才會套用。

固定網址格式：`/collections/{slug}`。儲存後不能改名。標題、介紹、封面與條件都可更新。物件清單只讀取公開、在售、已發布且未刪除物件；下架物件會從清單移除。沒有結果時提供其他物件與諮詢入口。

選擇「已停用」並儲存，可停止公開讀取。草稿與停用主題的公開 URL 回傳404；工作人員仍可從後台預覽或重新發布。

## 實作與權限

- 獨立 property_collections 表，對應後台列表／新增／編輯／已儲存預覽頁與公開頁。
- 新增與編輯沿用現有 editor／admin／owner 權限；保存操作寫入現有 content_* 稽核事件，resource_type=property_collection。
- RLS 限制訪客讀取已發布主題。authenticated 角色的寫入還必須具有有效工作人員 profile，並將 updated_by 設為目前使用者。
- 以欄位 UPDATE grant 固定 slug／ID／建立資訊，不提供應用程式 DELETE 權限。
- 封面保存唯一 storage path，伺服器依自身 Supabase origin 推導 URL，不接受外部封面 URL。上傳沿用既有 media bucket 角色限制。
- 公開 metadata 使用主題封面、標題、介紹與固定 URL，包含 canonical／Open Graph／Twitter；已發布主題加入 sitemap。Facebook／LINE 平台是否已重新抓取須另實測。
- 地區 OR；類型／預算／其他要求 AND。數字預算欄位也可在一般搜尋結果 URL 往返，列表／API／主題頁共用同一查詢。

## 資料庫部署

已在 staging (`niorteztdbuyusemsgwa`) 套用 migration `20261001062904_property_share_collections.sql`。版本與 MCP 建立的遠端 migration ledger 一致。

正式站尚未部署。正式環境上線前必須只套用這個新增 migration；不要因既有歷史 migration ledger 差異而直接對正式庫執行整批 db push。此 migration 不修改既有物件／客戶資料。

Preview 建立示範主題 `changhua-under-2000`（鹿港・福興・秀水，最高2000萬），供審閱。沒有建立正式站主題。

## 已完成驗證

- 主題驗證、固定網址、封面 URL、安全路徑、搜尋條件往返測試。
- 原有搜尋排名、地區 OR、首頁分享 metadata、導覽與 analytics 回歸。
- TypeScript、ESLint、Next build 通過。
- staging RLS 實際交易測試：anon／一般 authenticated／工作人員的讀取與寫入限制、發布／停用、固定 slug、預算上下限約束。測試 fixture 全部 rollback，沒有修改帳號。
- 新表沒有新增 Security Advisor 警告；既有函式與 Auth 警告維持原狀。

公開 Preview HTTP／metadata／sitemap／API 實測結果另記於 PR。完整登入後的瀏覽器上傳／剪貼簿／Facebook與LINE操作需在 Preview 審閱。
