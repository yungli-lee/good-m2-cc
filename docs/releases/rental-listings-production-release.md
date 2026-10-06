# 租件功能 Production release

## 發布候選版本
PR #35：https://github.com/yungli-lee/good-m2-cc/pull/35
已驗證程式 commit：c9bf28c06e8a40735cc2dbbe189b636781a2729e
Cloudflare 成功 Preview：https://5c471b4d.good-m2-cc.pages.dev
正式站：https://good.m2.cc
正式 Supabase project：rlbuadkmylulieoryzal
Preview project：niorteztdbuyusemsgwa

2026-10-06 production 唯讀預檢：37 筆物件（published 27、archived 7、draft 2、expired 1），六個租件欄位均尚未存在。執行前重新檢查；筆數可能因正常建檔而增加。

## 發布順序
1. 確認 production project identity、main/head 沒有新變動，保留目前物件筆數及狀態分布。
2. 對 production 套用 supabase/migrations/20261006053641_rental_listing_support.sql，使用 migration 工具保留紀錄。先加欄位，再部署程式；新程式查詢依賴租件欄位。
3. 驗證六個欄位、五個 constraints、索引及既有物件預設 sale。若 migration 失敗，停止部署並調查，勿重複盲目執行。
4. 合併 PR #35 至 main，確認 Cloudflare production deployment 成功，記錄實際合併 SHA 與部署 ID。
5. 正式站驗證：售件原價格、出租篩選（月租單位為元）、全部物件篩選、物件詳情、後台新增／編輯租件、AI 解析、月租必填與搜尋預算。
6. 使用正式實際租件驗證建檔與前台呈現；不要匯入 Preview 測試資料。使用者在 Preview 新增的 20261006 租件不會因程式發布自動複製到 production，需另行建檔或授權匯入。
7. 確認公開回應不包含內部備註、私密地址或其他後台欄位。

## 資料庫驗證
先執行：
```sql
SELECT count(*) AS property_count FROM public.properties;
SELECT status, count(*) FROM public.properties GROUP BY status ORDER BY status;
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'properties'
AND column_name IN ('transaction_type','rent_monthly','deposit_months',
'minimum_lease_months','rental_equipment','lease_notarization_required')
ORDER BY column_name;
```

Migration 後再執行：
```sql
SELECT transaction_type, status, count(*)
FROM public.properties GROUP BY transaction_type, status ORDER BY transaction_type, status;
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'public.properties'::regclass
AND conname IN ('properties_published_rental_price_check',
'properties_transaction_type_check','properties_rent_monthly_check',
'properties_deposit_months_check','properties_minimum_lease_months_check');
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'properties'
AND indexname = 'properties_transaction_rent_idx';
SELECT count(*) AS invalid_published_rentals FROM public.properties
WHERE transaction_type = 'rent' AND status = 'published'
AND (rent_monthly IS NULL OR rent_monthly <= 0);
```

預期：六欄位／五 constraints／一索引，invalid_published_rentals = 0；既有物件均 sale，總筆數不因 migration 改變。Migration 不修改 RLS、角色或 grants。

## 已完成驗證
- TypeScript、lint、Cloudflare build 通過。
- 租件 parser、schema、payload、搜尋、連結、health、concierge API 測試通過。
- Preview 實際後台 AI 解析、新增草稿、編輯及資料庫讀回通過。
- 月租 128,000 在 150,000 上限可找到，在 120,000 上限被排除；售件／租件／全部篩選與公開資料隔離通過。
- 使用者確認後台新增租件及前台顯示 OK。
- 已知既有例外：完整 test:concierge 中「週日下午方便嗎？」時段意圖斷言失敗；相關 viewing-intent 程式未由此 PR 修改。租件 concierge API 測試通過。

## 回復
- 基準 main：15e38d45da93674f9a5e278017c58092078be07e。
- 如果正式站已有 published 租件，先記錄這些租件 ID、原狀態及內容，將它們改為 draft，避免舊版以售價格式呈現租件。保留資料，不刪除。
- Revert 發布合併 commit，重新部署原版並驗證售件頁面。
- 保留新增資料庫欄位、constraints 與索引，不 DROP；加欄位與舊版程式相容。
- 修正後重新發布，依先前記錄恢復租件狀態。

## 本次準備範圍
準備發布文件與 ready-for-review PR；尚未執行 production migration、合併 main 或正式部署。
