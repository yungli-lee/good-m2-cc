# 物件 AI 對談正式發布紀錄

日期：2026-10-06

## 範圍

物件頁與 /guide 支援漸進對談、帶看邀約、確認聯絡資料後送出需求，保留角色語音介紹。帶看時間由真人確認；建蔽率、容積率與採光沒有確認資料時不推測。電話前後端共用驗證；唯讀聊天暫時失敗最多重試一次，詢問單不自動重送。

## 驗收

- 功能版本：f4ca4d87b1ecceec52ecbad73cd2cf9e17523a7a。
- Cloudflare Preview：https://e598754e.good-m2-cc.pages.dev。
- concierge 單元/API、角色導覽、TypeScript、ESLint 通過。
- Preview 實測固定物件、租件條件、邀約與取消、圖面、LINE、採光、土地面積與建蔽容積待查核、錯誤恢復。
- 使用者手機驗收搜尋建地、選取福興甲建、帶看表單送出及 LINE 通知成功；通知保留物件、希望時段、聯絡資料與補充問題。
- 使用者已授權整理上線。自動瀏覽器受環境限制，視覺驗收採使用者錄影與截圖。

## 發布與回復

依 feature → staging → main 發布。正式站部署後以公開頁面與唯讀聊天驗證，不建立測試詢問單。
本次無資料庫 migration、RLS、密鑰或環境設定變更。
若有異常，回復上一個 Cloudflare Production 部署，或 revert 本次發布合併。上一版 main：eff6ddd8c1e8d4cf5cb9069bfc911142c3c2ba5d；無需還原資料庫。
