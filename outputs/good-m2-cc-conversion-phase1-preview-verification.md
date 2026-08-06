# Conversion Analytics Phase 1 Preview Verification Runbook

狀態：等待 migration 核准；以下命令/SQL均未執行。

## Approval gate

1. 確認 URL/project 是 Preview，不是 Production。
2. 執行 `scripts/sql/conversion-analytics-phase1-precheck.sql`（SELECT only）。
3. 保存 row counts、constraints、RLS、grants與 migration ledger evidence。
4. Review migration diff；使用者人工執行 migration。
5. 立即執行 `scripts/sql/conversion-analytics-phase1-verify.sql`。
6. 任一 schema/security/data check失敗即停止，不繼續 application E2E。

## Expected schema result

- analytics_events新欄完整，event_id unique；舊 rows environment=legacy_unknown且資料筆數不減。
- lead_attributions存在，inquiry unique、RLS force enabled。
- inquiries僅新增 visitor/session/status，既有 rows status=missing。
- anon無 insert；authenticated不能直接寫；admin/owner read；service role server manage。
- 所有指定 indexes存在；沒有修改其他 CRM/CMS/Media table內容。

## E2E after implementation

Facebook UTM property landing→page/view_property→media→LINE；隔日 direct→form submit→inquiry_created→lead attribution。以相同 event_id重送驗證不增加 row。關閉 analytics endpoint驗證網站/inquiry仍成功。確認 Preview全部 environment=preview，production filter為零。

## Performance evidence

記錄 event request body bytes、response status、Worker outcome/exception、CPU duration、是否阻塞 navigation、是否重複 request。頁面 render不得查 analytics；ingestion不得全表 scan或聚合；不得出現 1102。

## Rollback/roll-forward

若 application producer尚未啟用且 Phase 1 event為零，可用 Preview rollback。若已有事件，rollback SQL主動拒絕，採 roll-forward migration；不得為了回退刪除事件或 inquiry attribution。Production始終只讀，直到獨立 release核准。
