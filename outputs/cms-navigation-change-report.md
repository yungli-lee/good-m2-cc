# CMS Navigation Change Report

## Migration review

`202607240101_site_navigation_items.sql` 建立：

- `site_navigation_items` table。
- `site_pages(id)` foreign key；page 刪除時相關 navigation row cascade 移除。
- location、target、非負排序、destination XOR 與 `(item_key, location)` unique constraints。
- visible partial index 與 page relation partial index。
- `set_updated_at()` trigger。
- RLS 與 public visible-only、staff select/insert/update/delete policies。
- anon/authenticated 最小 grants。
- 24 筆既有固定 route seed；不自動加入 custom pages。

第一份 migration 套用 Staging 後才發現任務明列的「首頁」未在 seed 中。為避免修改已套用 migration，新增 `202607240102_navigation_home_seed.sql`，以 `ON CONFLICT DO NOTHING` additive 補入 Header、Mobile、Footer 三筆首頁資料。

Static review：兩份 migration 均無 `drop table`、`drop column`、`truncate` 或既有非空資料覆寫。第二份只做 idempotent seed insert。

## Staging migration result

- Linked ref：`niorteztdbuyusemsgwa`
- Production ref：`rlbuadkmylulieoryzal`
- Identity comparison：不同，執行前逐次 fail-closed 驗證。
- 執行方式：只執行兩個 navigation SQL file；未使用 `migration up`、`db push` 或 `migration repair`。
- Result：PASS。
- Ledger：沒有修復或正規化；本 branch 的 migration ledger 漂移另案處理。

## Schema / RLS verification

- Table：存在。
- Columns：11。
- Indexes：4（包含 PK/unique 與兩個 explicit indexes）。
- Policies：5。
- RLS：enabled。
- Seeds：27；Header 9、Mobile 9、Footer 9；首頁可見資料 3。
- Anon：visible 可讀、hidden 不可讀、insert 被拒。
- Staff editor/admin/owner：transactional insert/update/delete PASS，最後 rollback。
- 無授權 authenticated：insert 被 RLS 拒絕，PASS。
- Custom page FK：`cms-preview-test` 綁定、改 label/sort/visibility、刪除契約 PASS，全程 rollback。

## Product changes

- 新增 `/admin/navigation` 列表、新增、編輯與刪除入口。
- 後台可維護 location、label、published page relation、固定/外部 href、target、排序與顯示狀態。
- 表單禁止同時填 page 與 href，外部 URL 只接受 HTTP(S)，刪除需確認。
- Public React layout 取得一次共用 navigation，傳給 Header 與 Footer。
- Header 與 Mobile 分別依 location 渲染。
- Footer 新增 CMS navigation。
- Home CMS API 回傳同一 navigation payload；legacy renderer 取代整段舊 nav 並加入 footer nav。
- 移除 legacy HTML 固定 menu links，不保留 CMS 空資料 hardcoded fallback。
- CRUD 成功後 revalidate 首頁、常用固定 routes、關聯 custom page 與 `site-navigation` tag。

## Navigation source before / after

- Before：React hardcoded array + legacy static HTML + empty Footer。
- After：`site_navigation_items` → shared query/resolver → React/legacy Header, Mobile, Footer。

## Production safety

- 未連線或修改 Production ref。
- 未執行 Production SQL。
- 未使用 migration up、db push、migration repair。
- 未部署 Production、未 merge main。
- 未修改任何既有 migration。
