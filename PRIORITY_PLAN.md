# good.m2.cc Priority Plan

Based on the Sprint 0-16 inventory on `preview/sprint-a-production-wiring`.

This file is planning only. It does not change production behavior.

## 1. 必須先補才能稱 Sprint A 完成

### 1. 統一公開服務表單到 Next / Supabase 流程

- 對應任務：第 4 項、第 13 項、第 14 項
- 建議順序：第 1 優先
- 理由：目前首頁表單仍由 legacy script 呼叫 `/api/service-request`，而 Sprint A 的安全表單流程在 `/api/public/inquiries`。兩套流程並存，會讓資料、通知、安全驗證與後台詢問單管理不一致。
- 風險：高。公開表單涉及個資、垃圾訊息、通知信與資料落點。
- 是否影響 production：會。若 production 切到 Next 版，使用者送出表單可能不進入新後台詢問單流程。
- 最小修正：先讓首頁服務表單送到 `/api/public/inquiries`，保留原本畫面，不改 Hero。

### 2. 補齊 server-side rate limit

- 對應任務：第 4 項、第 14 項
- 建議順序：第 2 優先
- 理由：migration 已有 `rate_limit_events`，但 `/api/public/inquiries` 尚未實作 60 秒 3 次限制。
- 風險：高。缺 rate limit 會增加垃圾訊息與濫用風險。
- 是否影響 production：會。production 公開表單會直接暴露。
- 最小修正：只在 `/api/public/inquiries` 補 rate limit，不擴大到其他尚未存在的公開 API。

### 3. Turnstile production 必填化

- 對應任務：第 4 項、第 14 項
- 建議順序：第 3 優先
- 理由：目前 `TURNSTILE_SECRET_KEY` 未設定時會 skipped，適合 local fallback，但 production 不應跳過。
- 風險：高。機器人防護可能被誤認為已啟用。
- 是否影響 production：會。
- 最小修正：production 環境缺 secret 時回傳一般失敗訊息；development 可保留 skipped。

### 4. 建立 `/admin/audit-logs` 只讀頁

- 對應任務：第 10 項、第 14 項
- 建議順序：第 4 優先
- 理由：`audit_logs` table、RLS、`recordAuditLog()` 已存在，但沒有後台查看頁。Sprint A README 已列出 admin/owner 可看 audit logs。
- 風險：中。缺頁面會降低問題追蹤能力，但不阻擋物件 CRUD。
- 是否影響 production：間接影響。出問題時追查能力不足。
- 最小修正：只做列表頁，限 admin / owner，先不做複雜篩選。

### 5. 補 `/admin/blocklist` 最小管理頁

- 對應任務：第 11 項、第 4 項、第 14 項
- 建議順序：第 5 優先
- 理由：`blocklist` table、預設 keyword、表單檢查已存在，但沒有後台管理介面。
- 風險：中。垃圾訊息防護規則不可維護。
- 是否影響 production：會。管理者無法即時新增封鎖規則。
- 最小修正：先做列表、新增、啟用 / 停用；搜尋與完整 audit 可後補。

### 6. 補上線前必備安全 headers

- 對應任務：第 2 項、第 14 項
- 建議順序：第 6 優先
- 理由：`next.config.ts` 已有 `X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`，但缺 CSP、HSTS。
- 風險：中。安全基線不完整。
- 是否影響 production：會，但需謹慎測試避免 CSP 擋到 Supabase、Line、靜態圖片或 script。
- 最小修正：先加保守 CSP report-only 或窄範圍 CSP；HSTS 確認 HTTPS 後再開。

## 2. 可放 Sprint B

### 1. 首頁精選物件區塊

- 對應任務：第 8 項
- 建議順序：Sprint B 第 1 優先
- 理由：`listFeaturedProperties()` 與 `/api/public/featured-properties` 已存在，但首頁尚未顯示精選物件。
- 風險：中。首頁無法帶出案源，不影響後台核心。
- 是否影響 production：會影響前台內容價值，但不影響安全。
- 最小修正：在服務理念區塊下方新增最多 6 筆精選物件與空狀態。

### 2. `/admin` Dashboard 最小版

- 對應任務：第 12 項
- 建議順序：Sprint B 第 2 優先
- 理由：目前 `/admin` 直接 redirect `/admin/properties`，缺總覽。
- 風險：低到中。後台可用，但管理效率差。
- 是否影響 production：不直接影響前台。
- 最小修正：先顯示物件數、詢問單數、快捷按鈕；影音、analytics 先不放。

### 3. 詢問單列表篩選與搜尋

- 對應任務：第 13 項
- 建議順序：Sprint B 第 3 優先
- 理由：詢問單列表、詳細、狀態更新、備註、spam 已有，但缺篩選與搜尋。
- 風險：中。詢問單多時管理困難。
- 是否影響 production：會影響後台作業效率。
- 最小修正：先加狀態篩選與關鍵字搜尋；CSV 匯出延後。

### 4. 試算工具獨立路由第一階段

- 對應任務：第 5 項、第 6 項、第 7 項
- 建議順序：Sprint B 第 4 優先
- 理由：首頁已有房貸試算內容，但缺 `/calculator`、`/calculator/mortgage`、`/calculator/seller-net-profit`、`/calculator/purchase-cost`。
- 風險：低到中。影響可分享性與手機捷徑需求。
- 是否影響 production：影響 SEO 與分享，不影響後台安全。
- 最小修正：先建立 `/calculator` 與 `/calculator/mortgage`，沿用現有公式；其餘兩個工具分批做。

### 5. 上線前總驗收文件

- 對應任務：第 14 項
- 建議順序：Sprint B 第 5 優先
- 理由：目前沒有正式 go-live checklist 文件。
- 風險：中。缺一致驗收標準，容易誤切 production。
- 是否影響 production：間接影響。
- 最小修正：新增 `GO_LIVE_CHECKLIST.md`，標示必修 / 可延後。

### 6. 維護與備份策略文件

- 對應任務：第 15 項
- 建議順序：Sprint B 第 6 優先
- 理由：目前沒有備份、監控、資料保存、異常處理文件。
- 風險：中。正式上線後維運不可追蹤。
- 是否影響 production：間接影響。
- 最小修正：新增 `MAINTENANCE_PLAN.md`，先不做自動化。

## 3. 可放 Sprint C

### 1. 影片 / TikTok 手動管理

- 對應任務：第 9 項
- 建議順序：Sprint C 第 1 優先
- 理由：`SPRINT_A_README.md` 明確列 TikTok 不包含。此功能可增加內容活性，但不是核心交易 / 安全流程。
- 風險：低到中。若過早做 API 抓取，會增加外部依賴。
- 是否影響 production：不影響核心 production。
- 最小修正：先做 `videos` table 與 `/admin/videos` 手動輸入 TikTok 連結，不串 TikTok API。

### 2. 完整媒體能力：YouTube / MP4 / 圖片輪播 / 圖片壓縮

- 對應任務：第 3 項、第 14 項
- 建議順序：Sprint C 第 2 優先
- 理由：目前單張 / 多張圖片、封面已可用，但缺 YouTube、MP4、輪播與圖片重新壓縮。
- 風險：中。涉及 storage、前台渲染與檔案安全。
- 是否影響 production：會影響物件呈現品質。
- 最小修正：先做前台圖片輪播，再做 YouTube；MP4 上傳最後做。

### 3. 完整 Audit Log 篩選與缺漏 action 補齊

- 對應任務：第 10 項
- 建議順序：Sprint C 第 3 優先
- 理由：Sprint A 只需先能查看；完整篩選、影片與黑名單 audit 可後續補。
- 風險：中。
- 是否影響 production：間接影響稽核品質。
- 最小修正：先補黑名單 action audit，再補篩選。

### 4. 詢問單 CSV 匯出與刪除

- 對應任務：第 13 項
- 建議順序：Sprint C 第 4 優先
- 理由：列表與詳細處理流程優先，匯出涉及個資與權限控管。
- 風險：中到高，因 CSV 可能外洩個資。
- 是否影響 production：只影響管理需求。
- 最小修正：先做 admin/owner 限定匯出，欄位最小化。

## 4. 暫緩項目

### 1. GA4 與 `/admin/analytics`

- 對應任務：第 16 項
- 理由：`SPRINT_A_README.md` 明確列 Analytics 不包含。核心平台、安全表單、後台管理尚未收斂前，不建議先做分析 Dashboard。
- 風險：低。延後不影響網站核心功能。
- 是否影響 production：不影響正式可用性。
- 建議：先規劃 GA4 env 與 consent/隱私說明；Dashboard 等 Sprint C 後再做。

### 2. TikTok API 自動抓取

- 對應任務：第 9 項
- 理由：外部 API 權限、穩定性與 embed 政策可能變動。手動輸入影片連結即可先滿足首頁影音需求。
- 風險：中。自動抓取若失敗會讓首頁區塊不穩。
- 是否影響 production：不必要。
- 建議：先手動管理，未來再評估 API。

### 3. 自建流量統計資料庫

- 對應任務：第 16 項
- 理由：自建 page view / event tracking 會增加隱私、資料保存與效能負擔。
- 風險：中。
- 是否影響 production：可能增加資料庫寫入量。
- 建議：先使用 GA4 或 Cloudflare Web Analytics，不急著自建。

### 4. 完整自動備份與監控系統

- 對應任務：第 15 項
- 理由：策略文件應先完成；自動化監控與備份驗證可逐步導入。
- 風險：中。
- 是否影響 production：長期影響，但不阻擋 preview 驗證。
- 建議：先建立人工週檢表，再挑關鍵項目自動化。

## Suggested Execution Order

1. 統一首頁表單到 `/api/public/inquiries`
2. 補 server-side rate limit
3. Turnstile production 必填化
4. 建立 `/admin/audit-logs` 只讀頁
5. 建立 `/admin/blocklist` 最小管理頁
6. 補安全 headers
7. 首頁精選物件區塊
8. `/admin` Dashboard 最小版
9. 詢問單篩選與搜尋
10. Calculator routes 第一階段
11. Go-live checklist 文件
12. Maintenance plan 文件
13. Videos 手動管理
14. 物件媒體能力補強
15. Analytics / GA4

