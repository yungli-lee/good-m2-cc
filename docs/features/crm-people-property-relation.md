# CRM Phase 1：People–Property 正式關聯

Migration `202607290101_people_properties.sql` 建立 People 與 Property 多對多關聯，支援 owner、buyer、viewer、negotiator、tenant、landlord、referrer、contact、other；active 關係以 partial unique index 防重複，歷史以 archived 停用。

`people_properties` 包含 person/property FK、relationship type、note、status、started/ended、created_by、timestamps、archived_at；並建立 indexes、updated trigger、RLS policies 與 authenticated grants。

目前 UI 接通 People 詳情頁的關聯物件列表、新增與封存，以及 Property 編輯頁的關聯客戶列表。Server action 驗證 role、UUID、relationship type、duplicate error，查詢使用 nested select 避免 N+1。

Preview checklist：migration、schema/FK/RLS/index verify；People→Property create/reload/archive；Property→People read/reload；duplicate active；viewer read-only。

Production 必須先由授權人員執行 precheck 並在 Preview 驗證；本分支不執行 Production SQL、merge 或 deploy。Rollback 優先回退應用程式並保留 table，既有關聯以 archive 停用；不建議 DROP TABLE。People Timeline、Tasks、需求與媒合不在本階段。
