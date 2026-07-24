# Navigation CMS CRUD 404 Fix

## Root cause

修改前 update/delete 使用 Client Component `<form action={boundServerAction}>`。瀏覽器會以 POST/fetch 提交目前頁面：

`/admin/navigation/{id}/edit`

人工證據顯示 request name 為 `edit`、response 為 404，接著發生 client-side exception。Staging catalog 同時顯示 `life` navigation row 已不存在，證明 delete mutation 已執行，失敗點在刪除後的 Server Action/RSC route 收尾，而非資料庫拒絕刪除。

Cloudflare server log、404 response body 與 client stack trace需要該次已登入 request 或 Cloudflare log 權限；本執行環境無該登入 cookie及 Cloudflare API token，因此沒有將猜測內容填入這三項證據。

## Request contract

| Operation | Before | After |
|---|---|---|
| Create | POST/fetch current Server Action page | `POST /api/admin/navigation` |
| Update | POST/fetch `/admin/navigation/{id}/edit` | `PATCH /api/admin/navigation/{id}` |
| Delete | POST/fetch `/admin/navigation/{id}/edit` | `DELETE /api/admin/navigation/{id}` |

新 API 成功時回傳：

```json
{
  "ok": true,
  "redirectTo": "/admin/navigation?saved=1"
}
```

Client 使用 `router.replace()`，不再 refresh 已刪除的 edit route。

## Safety

- 每次 update/delete 先依 id 查詢並驗證存在。
- API 要求 editor/admin/owner。
- Update 使用共用 Zod schema 驗證 location、target、sort、page_id/href。
- Update/delete 均以 `.eq("id", id)` 精準操作。
- Delete 只操作 `site_navigation_items`，沒有刪除 `site_pages`。
- 不會依 item key 或 label 刪除其他 location。
- 找不到 item 回 JSON 404，不進行 mutation。

## Revalidation

成功後執行：

- `revalidateTag("site-navigation")`
- `revalidatePath("/")`
- `revalidatePath("/admin/navigation")`
- `revalidatePath("/admin/navigation/{id}/edit")`
- 有 linked page 時 `revalidatePath("/{page_key}")`

## Data evidence

- Linked project ref：`niorteztdbuyusemsgwa`。
- Production ref：`rlbuadkmylulieoryzal`，未連線或修改。
- Preview Public CMS API：`life` navigation row 已不存在。
- Preview `/new-life`：HTTP 200，title 為「運動保健康」。
- Preview Public CMS API：`new-life` 仍為 published、未 archived 的 custom page，證明刪除 navigation 沒有刪除 linked site page。
- Staging CLI 查詢沒有輸出 row payload，不能據此判定 page 不存在；公開 API 與實際 route 提供可重現的正向證據。
- 本階段沒有修改或重建人工測試資料。

## Verification

- Typecheck：PASS
- ESLint：PASS
- Navigation contract：PASS
- Navigation action routing：PASS
- CMS Phase 1 regression：PASS
- Property export / health / timeline：PASS
- Parser regression：PASS
- Production build：PASS
- Route manifest：`/api/admin/navigation`、`/api/admin/navigation/[id]` 均存在

## Preview retest

部署後使用新的 navigation item 驗證：

1. PATCH 更新 label、sort order、visibility。
2. 確認 redirect 至 `/admin/navigation?saved=1`。
3. 確認 Header 即時更新。
4. DELETE 後確認回列表且無 edit 404。
5. 若綁定 site page，確認 direct page URL 仍存在。
