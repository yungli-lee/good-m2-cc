# Media Capability Gap

本文件只追蹤媒體能力。安全項目請看 [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)；路由請看 [ROUTE_MAP.md](ROUTE_MAP.md)。

## Currently Supported

### Images

- 後台物件編輯頁支援單張與多張圖片上傳及追加選檔。
- Supabase Storage bucket：`property-media`。
- 支援 JPEG、PNG、WebP，每張 5MB 以內。
- 上傳後可寫入 `property_media` metadata。

### Video

- 物件媒體支援 MP4、WebM，上限 100MB；不支援 MOV，也不接受只修改副檔名的影片。
- 影片上傳時必須提供 JPEG、PNG 或 WebP Poster，大小 5MB 以內。
- 物件詳細頁使用 Poster 作為靜態畫面，點擊後才以 VideoLightbox 播放，不會在列表或頁面載入後自動播放。

### Cover

- 圖片與有 Poster 的影片都可設為封面，同一物件只保留一個封面。
- 影片封面在首頁、搜尋、物件列表、服務地區、SEO 與 Open Graph 使用 Poster，不使用影片 URL 作為圖片。
- 缺少 Poster 的影片不可設為封面；Poster 載入失敗時使用安全占位，不使版面破版。

### Ordering

- 圖片與影片共用 `property_media.sort_order`，並以 `created_at`、`id` 作穩定次排序。
- 桌機可使用「拖曳調整順序」，也可使用「上移／下移」。
- iPhone、iPad 等觸控裝置不依賴原生拖曳，使用「上移／下移」調整順序。
- 排序在放開或按下移動按鈕後儲存；失敗時回復原順序。
- 設為封面不改變排序，排序也不改變封面。

## Not Yet Supported

### Youtube

- `property_media` migration 有 media type 規劃方向，但目前產品流程未完成 YouTube URL 新增、排序與前台呈現。

### Carousel

- 物件詳細頁已有圖片 ImageLightbox 與影片 VideoLightbox；完整的跨圖片／影片單一輪播體驗仍可再改善。

### Compression

- 圖片上傳後自動壓縮尚未完成。

### Metadata Strip

- EXIF / GPS metadata strip 尚未完成。

## Recommended Next Step

1. 補圖片壓縮與 metadata strip。
2. 改善跨圖片／影片的完整輪播體驗。
3. 若要加入 YouTube，先完成 URL 安全、隱私與前台嵌入規格。
4. 若要擴充影片格式或轉碼，先更新 storage、安全、容量與備份文件。
