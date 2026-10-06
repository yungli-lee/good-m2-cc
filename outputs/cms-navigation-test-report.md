# CMS Navigation Test Report

## Staging

| Test | Result | Evidence |
|---|---|---|
| Staging identity | PASS | Linked ref 每次執行前均為 `niorteztdbuyusemsgwa`，且不等於 Production ref |
| Migration execution | PASS | 只執行 navigation SQL files |
| Schema catalog | PASS | 11 columns、4 indexes、5 policies、RLS enabled |
| Fixed seeds | PASS | 共 27；Header / Mobile / Footer 各 9 |
| Anon visible-only | PASS | 可見 rows 可讀、hidden probe 不可讀 |
| Anon write denied | PASS | insert 被拒 |
| Staff CRUD RLS | PASS | editor/admin/owner 身分 insert/update/delete，transaction rollback |
| Unauthorized authenticated CRUD | PASS | 無 staff profile 的 authenticated claim insert 被拒 |
| Custom page FK / CRUD contract | PASS | `cms-preview-test` bind、label/sort/hide/delete，transaction rollback |
| Test data cleanup | PASS | 所有 probe 均 rollback；Staging 保留 27 筆正式 seed |

## Local validation

| Test | Result |
|---|---|
| Typecheck | PASS |
| ESLint | PASS |
| Navigation contract test | PASS |
| Header renderer | PASS |
| Mobile renderer | PASS |
| Footer renderer | PASS |
| Hidden item resolver | PASS |
| Sort-order DB/query contract | PASS |
| External HTTP(S) URL | PASS |
| Unsafe URL rejection | PASS |
| `_blank` target validation | PASS |
| Custom published page resolver | PASS |
| Draft / archived page suppression | PASS |
| Fixed route resolver | PASS |
| Legacy hardcoded replacement | PASS |
| CMS Phase 1 regression | PASS |
| Property export / health / timeline regressions | PASS |
| Parser regression | PASS |
| Production build | PASS |
| Route manifest | PASS：包含 `/admin/navigation`、new、edit routes |
| Local Cloudflare artifact build | ENVIRONMENT BLOCKED：global pnpm store SQLite 無法開啟；Next production build 本身已 PASS，改由 Cloudflare Git integration 作權威 Edge build |

## Revalidation

Server actions 執行：

- `revalidatePath("/")`
- `revalidatePath("/contact")`
- `revalidatePath("/properties")`
- `revalidatePath("/knowledge")`
- `revalidatePath("/calculator")`
- `revalidatePath("/{page_key}")`（有 page relation 時）
- `revalidateTag("site-navigation")`

## Preview retest scope

部署後需以後台登入 session 做最後 UI/Edge 端驗收：

1. 新增 `cms-preview-test` Header item。
2. 修改 label、sort order、visible，確認不 redeploy 即更新。
3. 分別新增 Mobile / Footer item。
4. 測試 `_blank` 外部連結。
5. 刪除測試 item 並確認 direct custom page URL 仍可開啟。

這些 Preview UI 操作不以本地 build 或 SQL transactional test 冒充；本報告只將已實際執行項目列為 PASS。
