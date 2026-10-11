# 勇美雙軌銷售管理：Phase 1 實作規格（草稿）

> 狀態：設計與盤點，尚未變更正式站功能。目標是委託物件與買方需求雙軌推進，先提高跟進與帶看轉換率。

## 既有能力（main 程式已查證）
- `lib/people-properties.ts`：`people_properties` 連結人物與物件；已有 buyer、viewer、negotiator、owner 等關係，以及 `listPersonProperties`、`listPropertyPeople`。
- `people_activities`：已有拜訪、電話、LINE、需求討論等活動；存在 `app/api/admin/people-activities/route.ts`。
- `lib/properties/timeline.ts`：`property_timeline_events` 已有 showing、offer、negotiation、follow_up、closed 等事件；具有角色授權。
- 現有測試：`scripts/test-people-property-relation.ts`、`scripts/test-people-activity.ts`、`scripts/test-property-timeline.ts`。

## 第一階段：不重做 CRM，補上「下一步行動」
1. 後台新增銷售工作台，彙整每件委託的最新進度與應追蹤客戶。
2. 同一人物可連到多物件、同一物件可連到多人物；一切以既有 `people_properties` 為關聯主檔，不重複建立聯絡人。
3. 新增「跟進任務」資料模型（建議獨立 `sales_follow_up_tasks`，待檢查 Supabase migration 命名與權限後再決定）：
   - id、person_id（可空）、property_id（可空）、title、task_type、status、priority、due_at、assigned_to、notes、created_by、created_at、updated_at、completed_at。
   - 至少需要人員或物件其中一個關聯；狀態 open / completed / cancelled；到期日採含時區 timestamp，呈現台北時區。
   - 不存手機號碼等重複個資；若需要顯示聯絡資訊，從有權限的 CRM 主檔取得。
4. 工作台預設分三區：今日／逾期跟進、待確認帶看、物件待回報。每張卡可快速完成、延後、進入人員與物件詳情。
5. 帶看「詢問／待確認／已確認／完成／取消」需獨立狀態；未讀訊息或詢問時間不可自動算已確認帶看。
6. 物件頁與買方頁雙向連到同一筆跟進資料；手動變更狀態後保留操作紀錄。
7. 不能把廣告「訊息聯絡人」直接當作有效買方、已預約看屋或成交。來源 attribution 需區分 Meta 後台統計與人工確認。

## Phase 1 驗收案例
- 秀水美墅示例：7 位詢問，謝小姐標為「有帶看意願，尚未確認」，不算已預約帶看。
- 一個買方對兩物件詢問不產生兩筆 CRM 主檔；兩件物件各自可以看到該買方的關聯。
- 逾期、今日、未來任務分類正確；同一任務完成後不再出現在待辦清單。
- editor/admin/owner 可依既有授權操作；未登入與無權限的使用者不能讀取買方個資。
- 手機與桌機皆可操作；不改動前台公開資料、物件價格、屋主底價與已存在的 AI 同意保存流程。
- Preview 驗證通過後才考慮 merge/release，禁止直接部署 Production。

## 待實作前確認
- 檢視最新 Supabase migrations、RLS 政策、People CRM 後台路由與資料存取方式。
- 定義任務擁有人權限、後台角色可見性、取消及封存政策。
- 加入單元測試與介面驗證；變更資料庫前備份並制定回退方案。
- Phase 2 才增加規則式雙向媒合，Phase 3 再整合廣告來源與成交漏斗。
