# Media Capability Gap

本文件只追蹤媒體能力。安全項目請看 [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)；路由請看 [ROUTE_MAP.md](ROUTE_MAP.md)。

## Currently Supported

### Images

- 後台物件編輯頁支援單張圖片上傳。
- Supabase Storage bucket：`property-media`。
- 支援 jpg、jpeg、png、webp 規格方向。
- 上傳後可寫入 `property_media` metadata。

### Cover

- 物件可設定封面照片。
- 前台物件頁可顯示已設定封面或圖片。

## Not Yet Supported

### Youtube

- `property_media` migration 有 media type 規劃方向，但目前產品流程未完成 YouTube URL 新增、排序與前台呈現。

### MP4

- 目前 bucket 與流程以 images only first 為主。
- MP4 上傳、大小限制、轉碼、掃描與前台播放未完成。

### Carousel

- 前台物件詳細頁的完整圖片輪播尚未完成。

### Compression

- 圖片上傳後自動壓縮尚未完成。

### Metadata Strip

- EXIF / GPS metadata strip 尚未完成。

## Recommended Next Step

1. 先穩定單張與多張圖片排序、刪除、封面流程。
2. 補圖片壓縮與 metadata strip。
3. 再做前台 carousel。
4. 最後才加入 YouTube 與 MP4，並在加入前先更新 storage、安全與備份文件。

