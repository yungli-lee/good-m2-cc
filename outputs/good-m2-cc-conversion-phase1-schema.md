# Conversion Analytics Phase 1 Schema Proposal

Migration draft：`supabase/migrations/202608060101_conversion_analytics_phase1.sql`。Additive、transactional、idempotent；目前未執行。

## Schema diff

### analytics_events（ALTER）

新增：event_id、event_version、occurred_at、received_at、visitor_id、person_id、inquiry_id、requirement_id、property_id、utm_content、utm_term、device_class、source_system、environment、is_bot、is_internal、event_properties。保留既有 id/entity/metadata/device_type 等欄位以避免破壞舊資料。

舊 row backfill：event_id 隨機 UUID；occurred/received 使用 created_at；device_class 使用既有 device_type；source_system=`legacy_server`；environment=`legacy_unknown`；event_properties 使用 metadata。`legacy_unknown` 是 fail-closed 隔離，不能進 Preview/Production 報表。

Session compatibility：migration先讀 `information_schema.columns.udt_name`。已是 uuid時不變；text空表或所有非空值符合UUID格式時，將欄位明確轉成 uuid；空字串被明確視為 legacy missing並轉 NULL。任何非法非空值或未知型別都 raise exception，整個 transaction rollback；不刪除、不歸零、不生成替代 session id。舊 `char_length(session_id)` constraint在 transaction內移除，rollback轉回text並恢復。

Constraints：event_id global unique；v1；source/environment/device allowlist；event_properties 必須 object 且禁止常見敏感 key；CRM/property FK on delete set null。舊/new event name 在 rollout 期間並存，避免 TypeScript 與 DB constraint 不同步。

Indexes：environment+time、environment+event+time、visitor+time、session+time、inquiry、property。歸因查詢不能 scan 全表。

### lead_attributions（CREATE）

一 inquiry 一 immutable snapshot（inquiry_id unique）。visitor/session required；person/property 可後補或 nullable；first/lead/last non-direct event FK；三組 source/medium/campaign snapshot與時間。DB trigger只允許補一次 person_id與更新 attribution_status/updated_at；其他 snapshot欄位更新會被拒絕，不允許任意重算 first-touch。

### inquiries（ALTER）

只新增 visitor_id、session_id、attribution_status。沒有複製 UTM/landing/source snapshot，因為 `lead_attributions` 是歷史 truth。三欄讓 inquiry 在 analytics 失敗時仍可成功並可重試；既有 inquiry backfill missing。

## RLS and grants

- analytics_events：RLS + FORCE RLS；anon/authenticated 無 insert/update/delete；authenticated 只有 select grant，policy 仍限 admin/owner；service_role server manage。
- lead_attributions：RLS + FORCE RLS；admin/owner read；service_role manage；anon 無權限。
- inquiries：沿用既有 RLS/grants，只新增欄位，不開放 public direct table access。
- Browser 永遠只呼叫 Edge endpoint，不取得 service-role key。

## Rollback / roll-forward

Preview 且沒有任何 Phase 1 event 時，可執行 rollback SQL，將 analytics session UUID無損轉回text、恢復長度與event-name constraints並移除新表/欄。若已產生 Phase 1 events，rollback 會主動拒絕，必須 roll-forward，避免刪除 journey/attribution。Production 未核准前不得執行 migration 或 rollback。

## Known review points before approval

1. Production/Preview 現有 analytics row count、metadata keys與 constraint drift。
2. `crm_customer_requirements` 必須已存在，否則 requirement FK 會使 migration 失敗。
3. 是否接受 raw anonymous events 保存 13 個月與 visitor cookie expiry。
4. `force row level security` 與 Supabase service-role integration 在 Preview 實測。
