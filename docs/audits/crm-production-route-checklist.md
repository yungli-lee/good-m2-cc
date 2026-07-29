# CRM Production 頁面人工驗收清單

僅使用既有資料；不新增、修改或刪除正式資料。截圖遮蔽姓名、電話、Email、地址與備註。

## `/admin/people`

- [ ] 可正常開啟，無 404／500／白頁
- [ ] 顯示 People 總筆數或 summary
- [ ] 記錄目前顯示筆數
- [ ] 確認是否最多顯示 150 筆
- [ ] 確認是否有 pagination、cursor 或 offset
- [ ] 姓名搜尋
- [ ] 電話搜尋（只記錄成功／失敗，不截圖電話）
- [ ] 狀態篩選
- [ ] 負責人篩選
- [ ] 若總數超過 150，確認第 151 筆是否可被搜尋或分頁取得
- [ ] 記錄空狀態與錯誤狀態呈現

## `/admin/people/[id]`

- [ ] 基本資料可讀取
- [ ] 最近聯絡欄位狀態
- [ ] Timeline 顯示與日期排序
- [ ] 關聯物件區塊
- [ ] 任務／待辦區塊
- [ ] 空狀態與錯誤狀態清楚
- [ ] reload 後內容仍存在

## `/admin/people/[id]/edit`

- [ ] 頁面可載入
- [ ] 欄位與角色完整
- [ ] validation 訊息可見
- [ ] 本次只檢查，不送出任何修改

## Evidence 回報

- Production URL：
- Deployment ID／commit：
- People total／visible count：
- Pagination：
- Search／filter：
- Detail／timeline：
- Edit page：
- 任何 404／500／權限錯誤：
