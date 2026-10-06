# 太平洋網址匯入（Preview）

後台 `/admin/properties/new` 新增「太平洋物件網址匯入」。貼上公開物件詳細頁網址 → 讀取資料 → 建立草稿並匯入照片 → 開啟編輯頁補充資料 → 人工確認後上架。正式站尚未發布此功能。

支援太平洋 HTTPS ObjectDetail 詳細頁及租賃詳細頁的 saleID。以來源編號產生 `pacific-s2984754` slug；來源編號與原網址保存在內部資料。重複匯入會導向原物件，沒有自動覆寫或同步。

僅帶入來源公開欄位；屋主、底價、委託期限、開發人員不會推測。坪數、屋齡、學區、車位權利請人工確認。來源版型變更或未公開案件會停止匯入。

照片最多 20 張，每張 6 MiB，僅允許來源照片主機的 JPEG、PNG、WebP；驗證檔案後下載到本站 property-media。禁止任意網址與 HTTP 重新導向。圖片失敗仍保留未上架草稿，顯示失敗序號並由編輯頁補檔。請保持匯入頁開啟直到完成。5 分鐘、有容量上限的 isolate 記憶體快取用於照片清單；建立草稿會重新讀取來源，不儲存來源 API header。

API `/api/admin/properties/pacific-import` 要求同源及 editor/admin/owner 身分，使用既有 Supabase 使用者 JWT 與 RLS，沒有 service-role 繞過。照片只准匯入來源編號一致且尚未上架的草稿。沿用既有儲存權限與稽核記錄。無資料庫 migration 或新 secret。

驗證：`node scripts/test-pacific-import.mjs` 涵蓋來源網址限制、欄位單位、私有欄位排除、圖片清單白名單與快取、檔案大小、登入與同源、重複草稿、強制 draft、已上架拒絕圖片、本站照片寫入及寫入失敗清理。另跑 TypeScript 與 ESLint。

人工驗收待辦：在 Preview 登入，以 S2984754 讀取、建立草稿，確認標題、698 萬、34.86 坪、照片與封面；修改並保存；再匯入相同網址應導向原物件。確認需要的資料後才上架。Production 另行批准 release。
