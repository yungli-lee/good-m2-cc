# Project Status

本文件作為 good.m2.cc 目前完成度與功能盤點入口，後續 Sprint 只需持續更新此表，不需要每次重新 analyze 全專案。

Production baseline：

- Production main：`7bc404a`
- Production 驗收已通過：首頁物件 carousel、首頁最新知識、`/knowledge`、後台登入、Knowledge Frontend
- 重要工程紀錄：見 [LESSONS_LEARNED.md](LESSONS_LEARNED.md)

| 編號 | 功能 | 狀態 | Production | 備註 |
| --- | --- | --- | --- | --- |
| 0 | Route 規劃 | 已完成 | 可用 | 主要前台、後台、公開物件、Knowledge route 已建立；後續新增功能需持續更新 route map。 |
| 1 | Hero / 首頁主視覺 | 已完成 | 可用 | 首頁既有靜態內容已保留並接入 production。 |
| 2 | 架構與資安規格 | 部分完成 | 可用但需持續檢查 | Supabase Auth、RLS、release checklist、DB drift checklist 已建立；仍需每次 release 實際驗證 env、RLS、Storage policy。 |
| 3 | 主推物件 / 首頁物件探索 | 已完成 | 可用 | 首頁物件 carousel、精選物件、最新上架、簡易搜尋已通過 production 驗收。 |
| 4 | 表單安全 | 部分完成 | 可用但有風險 | 詢問單與基礎防護已存在；rate limit、通知、spam 監控仍需持續驗證。 |
| 5 | Seller Calculator | 未完成 | 不可用 | 已移除 obsolete「賣屋淨利反成交價試算」卡片；正式 seller calculator 需另排。 |
| 6 | Mortgage Calculator | 部分完成 | 需人工驗收 | 前台試算工具區仍需完整 production 驗收與規則確認。 |
| 7 | Purchase Cost | 未完成 | 不可用 | 尚未完成買方成本試算正式功能。 |
| 8 | Featured Properties | 已完成 | 可用 | 後台精選、公開查詢、首頁展示已串接；需持續確認 deleted/unpublished 不外露。 |
| 9 | TikTok 最新影音分享 | 未完成 | 不可用 | 尚未建立 videos table、後台管理或首頁影音區塊。 |
| 10 | Audit Log 後台操作紀錄 | 部分完成 | 可用但需擴充 | `/admin/audit` 與多數操作寫入已存在；仍需持續補齊所有新功能 audit 與可讀性。 |
| 11 | 後台黑名單管理介面 | 部分完成 | 有風險 | DB / blocklist 基礎存在；完整後台 CRUD 與 audit 管理仍未完成。 |
| 12 | 後台 Dashboard 總覽 | 未完成 | 不可用 | `/admin` 仍以既有管理頁為主，尚未做營運總覽。 |
| 13 | 詢問單後台管理 | 部分完成 | 可用但需擴充 | `/admin/inquiries` 基礎存在；搜尋、篩選、匯出、個資治理仍需補強。 |
| 14 | 上線前總驗收清單 | 已完成 | 可用 | Production release checklist、DB release checklist 已建立；release 時必須實際執行，不可只看文件。 |
| 15 | 上線後維護與備份策略 | 部分完成 | 有風險 | 維護文件已有基礎；仍需定期備份、還原演練、Storage 驗證與責任分工。 |
| 16 | 網站流量分析 Dashboard | 未完成 | 不可用 | 尚未完成 GA4 / analytics dashboard / 權限與報表。 |
