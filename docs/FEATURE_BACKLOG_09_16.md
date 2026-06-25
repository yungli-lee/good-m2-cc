# Feature Backlog 09-16

本文件追蹤第 9 到第 16 項任務。總狀態請看 [../PROJECT_STATUS.md](../PROJECT_STATUS.md)；Roadmap 排程請看 [../ROADMAP.md](../ROADMAP.md)。

## 9. TikTok 最新影音分享

- Current Status：未完成。
- Existing Evidence：僅首頁 footer 有 TikTok 連結；未找到 `/admin/videos` 或 videos table。
- Missing Scope：首頁最新影音區塊、videos table、後台影音管理、published filter、RLS。
- Production Risk：若未完成不影響核心物件平台，但不可宣稱已完成影音功能。
- Recommended Next Step：Sprint B/C 先做手動輸入 TikTok embed，不直接串 API。
- Explicit Non Goals：Sprint A 不新增 TikTok。

## 10. Audit Log 後台操作紀錄

- Current Status：部分完成。
- Existing Evidence：`audit_logs` table migration、`lib/audit/audit-log.ts`、部分 property/media/inquiry action 寫入。
- Missing Scope：`/admin/audit-logs` 查看、篩選、權限 UI、登入成功/失敗完整紀錄、影片與黑名單操作紀錄。
- Production Risk：正式商用追蹤能力不足。
- Recommended Next Step：先建立只讀列表與基本篩選，限 admin / owner。
- Explicit Non Goals：不在第一版提供修改或刪除 audit log。

## 11. 後台黑名單管理介面

- Current Status：部分完成。
- Existing Evidence：`blocklist` table migration、public inquiries 檢查流程。
- Missing Scope：`/admin/blocklist`、新增/編輯/啟停/軟刪除、audit log。
- Production Risk：無 UI 時只能靠 SQL 維護，營運風險較高。
- Recommended Next Step：建立最小 CRUD 與 active filter。
- Explicit Non Goals：不在前台顯示封鎖原因。

## 12. 後台 Dashboard 總覽

- Current Status：未完成。
- Existing Evidence：`/admin` 目前導向 `/admin/properties`。
- Missing Scope：統計卡、最新詢問、最新 audit、快捷按鈕、角色差異。
- Production Risk：不阻擋核心 CRUD，但影響後台效率。
- Recommended Next Step：Sprint C 再做；Sprint A 先保留 redirect。
- Explicit Non Goals：Sprint A 不新增 Dashboard。

## 13. 詢問單後台管理

- Current Status：部分完成。
- Existing Evidence：`/admin/inquiries`、`/admin/inquiries/[id]`、詢問單 API 與狀態更新方向存在。
- Missing Scope：依狀態/日期篩選、搜尋、CSV、刪除、查看詳細 audit、完整個資遮蔽策略。
- Production Risk：詢問單可能能看能處理，但營運追蹤與個資治理不足。
- Recommended Next Step：先補篩選、搜尋與權限驗證，再考慮 CSV。
- Explicit Non Goals：不把詢問單公開到前台。

## 14. 上線前總驗收清單

- Current Status：部分完成。
- Existing Evidence：本文件群新增 [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) 作為正式檢查入口。
- Missing Scope：尚未完成實機 production 驗收、Supabase production migration 驗收、表單通知信、SEO、備份演練。
- Production Risk：未完成前不建議正式切 production。
- Recommended Next Step：按 MUST 項逐項驗收並留下紀錄。
- Explicit Non Goals：不把 checklist 本身視為功能完成。

## 15. 上線後維護與備份策略

- Current Status：部分完成。
- Existing Evidence：本文件群新增 [MAINTENANCE_AND_BACKUP.md](MAINTENANCE_AND_BACKUP.md) 作為維護計畫入口。
- Missing Scope：實際備份排程、還原演練、負責人與監控工具。
- Production Risk：缺少還原演練會增加資料遺失風險。
- Recommended Next Step：先執行一次 Supabase DB 與 Storage restore drill。
- Explicit Non Goals：不在文件階段新增外部監控服務。

## 16. 網站流量分析 Dashboard

- Current Status：未完成。
- Existing Evidence：未找到 `/admin/analytics`，未確認 GA4 整合。
- Missing Scope：GA4、資料來源、dashboard、權限、頁面排行、物件排行、工具排行。
- Production Risk：不影響核心交易流程，但影響營運分析。
- Recommended Next Step：先加 GA4，再做 dashboard。
- Explicit Non Goals：Sprint A 不新增 Analytics。

