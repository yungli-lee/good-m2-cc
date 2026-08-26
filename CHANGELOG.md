# Changelog

本檔採用 Keep a Changelog 格式，只記錄已完成且已驗證的功能。規劃、待辦與 backlog 請看 [ROADMAP.md](ROADMAP.md) 與 [PROJECT_STATUS.md](PROJECT_STATUS.md)。

## [Unreleased]

### Added

- 建立 Sprint A-0 產品管理文件基礎。
- 物件媒體支援 MP4／WebM 上傳、影片 Poster 與 VideoLightbox 播放。
- 圖片及有 Poster 的影片皆可設為封面，列表與 SEO／Open Graph 使用靜態封面圖片。
- 後台物件媒體支援圖片／影片混合排序：桌機可拖曳或上移／下移，觸控裝置使用上移／下移。

### Changed

- 物件媒體依 `sort_order`、`created_at`、`id` 穩定排序，封面不在詳細媒體清單重複顯示。
- 排序 API 驗證同一物件的完整未刪除媒體集合，失敗時回復原排序。

## [Sprint A Preview]

### Added

- Next.js App Router preview 平台。
- Supabase Auth 後台登入頁 `/admin/login`。
- 後台物件列表、新增與編輯路由。
- 公開物件列表 `/properties` 與物件詳細頁 `/properties/[slug]`。
- Supabase migration `202606250101_sprint_a_core_platform.sql`，包含核心資料表、RLS policy 與 `property-media` bucket 規格。
- 物件圖片上傳與封面設定 preview 流程。
- 詢問單 API 與基礎後台列表、詳細頁。

### Changed

- 首頁 Hero 背景圖改為「阿勇與吳小姐在筆電前討論」照片，並保留既有文案、CTA 與深藍遮罩。
- 首頁服務表單 anchor 統一為 `#service-form`。
