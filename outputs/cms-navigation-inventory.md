# CMS Navigation Inventory

## 結論

修改前導覽來源分裂為 React 固定陣列與 legacy HTML，Footer 沒有頁面導覽，custom page 無法自行加入選單。修改後 Header、Mobile、Footer 與 legacy homepage 全部由 `public.site_navigation_items` 及共用 resolver 取得資料，不保留 hardcoded menu fallback。

## 修改前矩陣

| Location | Label / route | Component / file | Source | Status |
|---|---|---|---|---|
| Header + Mobile | 服務理念、精選物件、知識庫、服務項目、房產試算工具、買屋流程、阿勇生活小提醒、聯絡我們 | `components/layout/site-header.tsx` | React constant / inline JSX | HARDCODED |
| Homepage Header + Mobile | 同一組固定連結 | `public/legacy-static/home-body.html` | Static HTML | DUPLICATED |
| Footer | 無頁面選單 | `components/layout/site-footer.tsx` | 無 | ORPHANED |
| Homepage Footer | 無頁面選單 | legacy HTML | 無 | ORPHANED |
| Custom page | `/{page_key}` 可直接開啟，但無選單入口 | `site_pages` | 無 navigation relation | ORPHANED |

## 修改後單一來源

| Consumer | Query / payload | Normalize / resolve | Fallback |
|---|---|---|---|
| React Header | `getAllPublicNavigationItems()` | `resolveNavigationItem()` | 無 |
| React Mobile | 同上，依 `location=mobile` | 同上 | 無 |
| React Footer | 同上，依 `location=footer` | 同上 | 無 |
| Legacy homepage Header / Mobile / Footer | `/api/public/home-cms` 的 `navigation` payload | 同一 server resolver，legacy renderer 僅渲染 resolved rows | 無 |
| Admin CRUD | `listAdminNavigationItems()` / `getAdminNavigationItem()` | 共用 schema validation | 無 |

## 管理契約

- CMS page：`page_id` 綁定 `site_pages`，公開 URL 統一解析為 `/{page_key}`。
- 固定 route 或首頁 anchor：使用 `href`。
- 外部連結：只允許 `http` / `https`，可選 `_blank`。
- `page_id` 與 `href` 必須擇一。
- 未發布或已 archived 的 page-linked item 不輸出，但 navigation row 保留，重新發布後可恢復。
- Custom page 不會因 published 自動加入選單，必須由後台明確新增。
- `sort_order` 升冪，接著以 `id` 穩定排序。
- 隱藏項目不輸出公開導覽。

## 固定 seed

Staging 現有 27 筆：Header、Mobile、Footer 各 9 筆，均包含：

1. 首頁
2. 服務理念
3. 精選物件
4. 知識庫
5. 服務項目
6. 房產試算工具
7. 買屋流程
8. 阿勇生活小提醒
9. 聯絡我們
