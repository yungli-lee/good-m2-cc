# 太平洋物件匯入（Preview）

在 `/admin/properties/new` 貼上太平洋出售物件網址並按匯入，先填入文字、管理費與繳費方式，再下載現場照片（type 1）和格局圖（type 5）。照片待上傳區提供預覽與移除；確認後按建立物件，沿用既有登入者的 Supabase Storage/RLS 與 property_media 寫入流程。

- 文字／照片清單來源為太平洋公開頁面使用的 ObjectAPI。來源 saleID 必須一致，加盟店／總部地址不讀取。
- 最多帶入 20 張，現場照片排在格局圖之前。重試以檔名、大小和固定 lastModified 排除重複。
- 單張上限 5MB；待上傳合計上限 40MB。超過容量或重複未加入時會提示。
- 圖片下載 API `/api/admin/import-property-photo` 需要 editor/admin/owner；只接受已確認的 houseol/pacific 圖片主機、固定路徑及 JPEG/PNG/WebP。禁用跟隨轉址，驗證 MIME、檔案簽章與串流容量；不轉送登入 cookie 或 API authorization 到圖片主機。
- 不儲存外站熱連結；按建立後才把照片複製到 property-media。來源水印維持原樣。
- 文字、照片下載失敗分別提示。建立物件後若部分照片儲存失敗，編輯頁提示補傳；第一張成功儲存的照片成為封面。
- 不新增資料表、Storage bucket、政策或 service-role 權限。

驗證：TypeScript、ESLint、照片來源／大小／簽章測試、S2984754 實際照片清單與 JPEG 下載。已實作待 Preview 桌機／手機及登入儲存流程驗收；尚未合併正式站。
