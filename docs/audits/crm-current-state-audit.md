# CRM 現況與完成度盤點

## 1. Executive summary

本報告依 repository 靜態證據完成；未取得 Production authenticated session、Production catalog 或 Cloudflare deployment metadata，因此 Production 實際可用範圍標記為 `UNKNOWN_DEPLOYMENT_EVIDENCE`，不將程式碼存在視為已上線。

目前 repository 的 CRM 核心是 People 主檔與 property timeline，估計完成度約 **35%（以本次指定的 People／Timeline／Tasks／任務包／需求配對全範圍計）**。People CRUD 與權限模型已有實作；任務、任務包、買方需求、客戶—物件關係與分群目前未找到對應 UI/API/schema。正式使用前最大風險是 Production schema／deployment 漂移與個資權限未完成實機驗證；目前沒有證據顯示程式會主動刪除 People 資料，People 刪除流程實際採 `deleted_at` 封存。

## 2. 功能完成度矩陣

| 模組 | Repository | DB | API | UI | Production | 測試 | 結論 |
|---|---|---|---|---|---|---|---|
| People 列表／搜尋／篩選 | COMPLETE | COMPLETE | server actions/query | COMPLETE | UNKNOWN | 無專屬 CRM test | PARTIAL |
| People 新增／編輯 | COMPLETE | COMPLETE | server actions | COMPLETE | UNKNOWN | schema 靜態驗證 | PARTIAL |
| People 詳情／角色 | COMPLETE | COMPLETE | server actions/query | COMPLETE | UNKNOWN | 無專屬 CRM test | PARTIAL |
| People 封存 | COMPLETE | COMPLETE | action 使用 `deleted_at` | COMPLETE | UNKNOWN | 無專屬 CRM test | PARTIAL |
| Property timeline | COMPLETE | COMPLETE | create/update/delete routes | COMPLETE（掛在物件編輯頁） | UNKNOWN | `test:timeline` PASS | PARTIAL |
| Customer timeline | MISSING | MISSING | MISSING | MISSING | UNKNOWN | MISSING | MISSING |
| Tasks／待辦 | MISSING | MISSING | MISSING | MISSING | UNKNOWN | MISSING | MISSING |
| Task packages／複製 | MISSING | MISSING | MISSING | MISSING | UNKNOWN | MISSING | MISSING |
| 買方需求／配對 | MISSING | MISSING | MISSING | MISSING | UNKNOWN | MISSING | MISSING |
| 屋主委託關係 | PARTIAL（物件欄位存在） | 無 People FK 證據 | MISSING | MISSING | UNKNOWN | MISSING | PARTIAL |
| 詢問單 CRM 入口 | COMPLETE | inquiries | API + admin UI | COMPLETE | UNKNOWN | 無 CRM 專屬 test | PARTIAL |

## 3. 路由與頁面

已找到 repository 路由：

- `/admin/people`
- `/admin/people/new`
- `/admin/people/[id]`
- `/admin/people/[id]/edit`
- `/admin/properties/[id]/edit`（含 property timeline）
- `/admin/properties/[id]/edit/timeline`
- `/admin/properties/[id]/edit/timeline/[eventId]/update`
- `/admin/properties/[id]/edit/timeline/[eventId]/delete`
- `/admin/inquiries`
- `/admin/inquiries/[id]`

後台 layout 有 `/admin/people` 導覽入口。未找到 `/admin/tasks`、任務包、客戶活動軌跡獨立 route、分群或買方需求 route。Production／Preview HTTP 狀態未取得，均為 `UNKNOWN`。

## 4. People 欄位矩陣

| 欄位 | DB | 新增 | 編輯 | API/action | 詳情 | 搜尋 | 狀態 |
|---|---|---|---|---|---|---|---|
| 顯示名稱／姓名 | `display_name`, `name` | 是 | 是 | 是 | 是 | 是 | COMPLETE |
| 正式姓名 | `legal_name` | 是 | 是 | 是 | 是 | 是 | COMPLETE |
| 手機／電話 | `phone`, normalized | 是 | 是 | 是 | 是 | 是 | COMPLETE |
| Email | `email`, normalized | 是 | 是 | 是 | 是 | 是 | COMPLETE |
| LINE | `line_id`, normalized | 是 | 是 | 是 | 是 | 是 | COMPLETE |
| 來源／狀態 | `source`, `status` | 是 | 是 | 是 | 列表／詳情 | 篩選 | COMPLETE |
| 負責人 | `assigned_to` | 是 | 是 | 是 | 是 | 篩選 | COMPLETE |
| 角色 | `person_roles` | 是 | 是 | 是 | 是 | 角色篩選 | COMPLETE |
| 備註 | `notes` | 是 | 是 | 是 | 是 | 否 | PARTIAL |
| last contacted | `last_contacted_at` | 無表單接線 | 無 | 無 action | 列表排序可讀 | 排序 | PARTIAL |
| 地址／公司／職稱／生日／家庭／聯絡偏好／個資同意 | 無明確欄位 | 否 | 否 | 否 | 否 | 否 | MISSING |

## 5. Timeline

`property_timeline_events` migration 建立欄位、事件類型 check、property FK、日期索引、updated trigger 與 RLS。UI 在物件編輯頁提供新增、編輯、刪除與日期排序；事件類型包含 created、published、showing、offer、negotiation、follow_up、closed、note 等。

資料流：

`PropertyTimeline` → POST route／update／delete route → `timeline.ts` validation → `property_timeline_events` → redirect + revalidation。

已取得的 root-cause 證據只證明 repository 目前有完整 renderer/query/write path；沒有 Production row count、RLS catalog 或 deployment log，故過去「活動消失」的 Production 原因仍為 `UNKNOWN`，不能宣稱已根治。可能檢查點包括 migration ledger、RLS、部署 commit 與 query error。

## 6. Tasks／任務包

在 `app`、`components`、`lib`、`supabase/migrations` 搜尋結果中，未找到 tasks、task_packages、task_templates 或 CRM task API／UI。任務建立、指派、到期、完成、提醒、複製任務包目前判定 `MISSING`。因此過去「複製鈕不見」目前沒有可追溯的現行 renderer；需另案設計 schema、API、權限與測試。

## 7. 搜尋、分類與配對

People query 支援 display/legal name、phone、LINE、Email 的 ilike 搜尋；role、status、source、assigned_to 篩選；newest、oldest、last_contacted、display_name 排序；目前使用 `limit(150)`，未找到 pagination。未找到 tag、未聯絡天數、待辦、買方需求或客戶分群 query。買方需求欄位與 People—property／inquiry／showing／deal 關聯模型未找到。

## 8. 屋主／賣方關係

People role enum 包含 `seller`、`landlord`，但未找到 People 與 properties 的正式關聯 table／FK。Property 本身有 listing、委託期間等部分業務欄位，但不是 CRM 關係模型；回報、議價、續約、未成交原因與成交關聯未找到獨立 CRM schema。

## 9. Schema／migration matrix

| Table | 用途 | Migration | API | UI | RLS | Production | 狀態 |
|---|---|---|---|---|---|---|---|
| `people` | People 主檔 | `202607020101`, `020102`, `040101` | server actions/query | People 4 routes | scoped policies | UNKNOWN | PARTIAL |
| `person_roles` | People 角色 | 同上 | People actions/query | People form/detail | scoped policies | UNKNOWN | PARTIAL |
| `property_timeline_events` | 物件活動軌跡 | `202606300101`, `030104`, `030105` | property timeline routes | property edit | staff/admin policies | UNKNOWN | PARTIAL |
| `inquiries` | 前台詢問／後台處理 | existing migrations | admin inquiry API/actions | inquiries UI | UNKNOWN | UNKNOWN | PARTIAL |
| `tasks`, `task_packages`, `customer_requirements`, `person_properties` | CRM 任務／需求／關係 | 未找到 | 未找到 | 未找到 | 未找到 | UNKNOWN | MISSING |

## 10. API／資料流與權限

People 使用 server actions：create、update、archive；角色以 `person_roles` insert/delete 同步，並寫 audit log。`requireRole([editor, admin, owner])` 保護 action；migration 040101 將 People RLS 收斂為 admin/owner 全量、editor 僅 assigned_to 或 created_by，`can_access_person` 為 SECURITY DEFINER 且 `search_path=public`。Timeline routes 依 editor/admin/owner 讀寫，update/delete 限 admin/owner。

未取得 Production RLS catalog 或 authenticated API 實測，故越權、service-role 使用、個資暴露與實際 grants 仍為 `UNKNOWN`。People 搜尋會回傳電話、Email 等敏感欄位給授權後台，應在正式驗收中確認角色隔離與 audit log。

## 11. Production／Repository 差異

本次無 Cloudflare deployment metadata、Production deployed commit 或合法 Production session，因此所有 Production 狀態標記 `UNKNOWN_DEPLOYMENT_EVIDENCE`。Repository 中未找到可列出的 CRM feature branch metadata；Git branch history 需在網路可用時以 `git branch -a`、`git log --all --grep='crm\|people\|timeline\|task'` 補查。

## 12. 測試現況

目前 package scripts 有 `test:timeline`，本地曾執行並 PASS；未找到專屬 People CRUD、RLS、Tasks、搜尋或 CRM permission tests。通用 `npm test` 未定義，不應視為產品測試失敗。

## 13. 缺陷清單

| ID | 嚴重度 | 現象 | Root cause／證據 | 影響 | 建議 |
|---|---|---|---|---|---|
| CRM-P0-001 | P0 | Production schema／deployment 未完成證據 | 缺 Production catalog、ledger、Cloudflare metadata | 不可確認正式可用性 | 建立唯讀 Production gate |
| CRM-P1-001 | P1 | Tasks／task packages 缺失 | 未找到 table、route、UI、migration | 無法做日常待辦與標準流程 | 先建 schema/API/RLS/測試 |
| CRM-P1-002 | P1 | 買方需求與配對缺失 | 未找到 requirement／relationship model | 無法媒合與追蹤需求 | 建立 requirement + relation 模型 |
| CRM-P1-003 | P1 | People CRUD／Timeline 缺專屬 E2E | 僅有 static timeline test | 實際 RLS／部署退化不易發現 | Preview 隔離資料 E2E |
| CRM-P2-001 | P2 | People list limit 150、無 pagination | `listAdminPeople` 使用 `.limit(150)` | 大量客戶遺漏 | 加 cursor/page pagination |
| CRM-P2-002 | P2 | last_contacted 未完整維護 | type 有欄位但 form/action 無接線 | 聯絡提醒不可信 | 建立 activity 寫入策略 |

## 14. Roadmap

### Phase 0：資料安全與阻斷

Production catalog／ledger／RLS／deployment evidence、People/TImeline row count、權限矩陣與備份驗證。不得修改正式資料。

### Phase 1：CRM 基礎可用

補 People CRUD／Timeline 專屬 E2E、pagination、last-contacted 更新、搜尋索引與錯誤監控；依賴現有 People schema，風險為 RLS 與個資。驗收：Preview 隔離資料完成 CRUD、reload、角色隔離、timeline 持久化。

### Phase 2：不動產業務流程

建立 customer_requirements、person_properties／seller assignments、showings、offers，串接 People、properties、inquiries、timeline；驗收需求 CRUD、物件配對、屋主委託與稽核。

### Phase 3：自動化與營運

建立 tasks、task_templates、task_packages、提醒、未聯絡分群、成交後追蹤；驗收任務包複製、相對日期、指派、逾期與 audit。

## 15. 結論

Repository 盤點完成，但 Production 實機與資料庫證據不足，不能宣稱 CRM 已完成或適合立即全面正式使用。建議下一步先完成 Phase 0 Production 唯讀 gate，再以 Preview 隔離資料補 People／Timeline E2E，之後才進入 Tasks 與需求配對開發。

**Final status：BLOCKED_BY_PRODUCTION_ACCESS**

## 16. Production Evidence Gate（本次補查）

本次工作區未提供 Cloudflare Pages API／Dashboard deployment metadata，也沒有合法 Production authenticated session 或只讀 Supabase catalog 連線。因此下列項目不能以 repository、`origin/main` 或 migration 檔案替代：

| Evidence | 結果 | 說明 |
|---|---|---|
| Production deployed commit | UNKNOWN | 未取得實際 deployment record |
| Production deployment ID／URL／build log | UNKNOWN | Cloudflare evidence 不可用 |
| `public.people` columns／FK／indexes／constraints | UNKNOWN | 未執行 Production catalog query |
| `public.person_roles` schema／RLS | UNKNOWN | 未執行 Production catalog query |
| `property_timeline_events` schema／RLS | UNKNOWN | 未執行 Production catalog query |
| tasks／task_packages／requirements／relations tables | UNKNOWN | 未執行 Production catalog query |
| inquiries → people foreign key | UNKNOWN | 未執行 Production catalog query |
| Production People row count | UNKNOWN | 未執行 Production aggregate query |
| `/admin/people` 實際頁面與第 151 筆風險 | UNKNOWN | 未取得合法唯讀 Production session |

### 程式碼已確認的 150 筆限制

`lib/people/queries.ts` 的 `listAdminPeople()` 使用 `.limit(150)`，未看到 offset、cursor 或 pagination 參數。這代表若 Production People 超過 150 筆，列表可能漏顯示後續資料；但因 Production row count 尚未取得，正式嚴重度暫列 `P1-CANDIDATE`，不可宣稱已觸發。

### 正式完成度（分層）

- Repository：已完成 People 基礎 CRUD／角色／搜尋篩選與 property timeline CRUD；Tasks、任務包、需求、分群與 People–Property relation 缺失。
- Database：People／person_roles／property timeline migration 在 repository 有定義；Production 實際套用狀態 UNKNOWN。
- Production 可用度：UNKNOWN，因 deployed commit、schema、RLS、頁面實測均未取得。
- 日常營運適用度：不建議正式判定；至少需先完成 Production evidence gate，並處理 pagination、RLS 實測與正式關係模型。

### 正式結論

- People CRUD：Repository 層具備；Production 正式可用性 UNKNOWN。
- Timeline：Repository 層具備；Production 持久化、RLS 與部署版本 UNKNOWN。
- 資料遺失風險：目前未見 People action 直接刪除，使用 `deleted_at` 封存；Production 實際資料安全仍需 catalog／audit evidence。
- 權限風險：Repository 有 scoped RLS 定義，但 Production policy 與角色行為未驗證，風險 UNKNOWN。
- Tasks 開發：不建議立即進入；應先完成 Production evidence、pagination／RLS gate，再設計 Tasks。
- People–Property relation：應在 Tasks 前補齊正式 schema、FK、RLS、API 與驗收測試。

**Updated final status：BLOCKED_BY_DEPLOYMENT_EVIDENCE**
