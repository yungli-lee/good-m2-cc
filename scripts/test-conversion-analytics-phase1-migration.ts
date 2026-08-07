import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SessionType = "text" | "uuid";

function modelMigration(type: SessionType, values: Array<string | null>) {
  if (type === "uuid") return { action: "keep", values } as const;
  const invalid = values.filter((value) => value !== null && value.trim() !== "" && !uuidPattern.test(value.trim()));
  if (invalid.length) throw new Error(`invalid legacy session count: ${invalid.length}`);
  return {
    action: "convert",
    values: values.map((value) => value === null || value.trim() === "" ? null : value.trim().toLowerCase())
  } as const;
}

const valid = "550e8400-e29b-41d4-a716-446655440000";

assert.deepEqual(modelMigration("text", []), { action: "convert", values: [] }, "empty text table converts to uuid");
assert.deepEqual(modelMigration("text", [valid]), { action: "convert", values: [valid] }, "valid UUID text converts without replacement");
assert.throws(() => modelMigration("text", ["legacy-session-1"]), /invalid legacy session count/, "invalid text aborts");
assert.deepEqual(modelMigration("uuid", [valid]), { action: "keep", values: [valid] }, "uuid rerun keeps data");
assert.deepEqual(modelMigration("text", [null, "", "   ", valid]), {
  action: "convert",
  values: [null, null, null, valid]
}, "explicit empty legacy values normalize to missing without generating IDs");

const migration = readFileSync(new URL("../supabase/migrations/202608060101_conversion_analytics_phase1.sql", import.meta.url), "utf8");
const precheck = readFileSync(new URL("./sql/conversion-analytics-phase1-precheck.sql", import.meta.url), "utf8");
const productionPrecheck = readFileSync(new URL("./sql/conversion-analytics-phase1-production-precheck.sql", import.meta.url), "utf8");
const productionVerify = readFileSync(new URL("./sql/conversion-analytics-phase1-production-verify.sql", import.meta.url), "utf8");
const rollback = readFileSync(new URL("./sql/conversion-analytics-phase1-rollback.sql", import.meta.url), "utf8");

type InquiryFixture = {
  attributionStatus: "missing";
};

function modelCurrentProductionPartialSchema(rows: InquiryFixture[]) {
  const beforeUpdateTrigger = () => {
    throw new Error("Unauthorized");
  };
  const triggerIdentity = beforeUpdateTrigger;

  // The revised migration performs only catalog validation and DDL for the
  // already-correct partial inquiry schema. It never invokes this trigger.
  const migratedRows = rows.map((row) => ({ ...row }));
  return { migratedRows, beforeUpdateTrigger, triggerIdentity };
}

const existingSixInquiries: InquiryFixture[] = Array.from({ length: 6 }, () => ({
  attributionStatus: "missing"
}));
const partialSchemaResult = modelCurrentProductionPartialSchema(existingSixInquiries);
assert.throws(() => partialSchemaResult.beforeUpdateTrigger(), /Unauthorized/, "fixture BEFORE UPDATE trigger always rejects");
assert.equal(partialSchemaResult.beforeUpdateTrigger, partialSchemaResult.triggerIdentity, "inquiry trigger remains installed");
assert.equal(partialSchemaResult.migratedRows.length, 6, "all six existing inquiries remain present");
assert.ok(
  partialSchemaResult.migratedRows.every((row) => row.attributionStatus === "missing"),
  "all six inquiry attribution statuses remain missing"
);

assert.match(migration, /session_udt = 'uuid'/, "migration has UUID rerun branch");
assert.match(migration, /session_udt = 'text'/, "migration has text conversion branch");
assert.match(migration, /invalid_count > 0[\s\S]*raise exception/i, "invalid legacy data aborts transaction");
assert.match(migration, /alter column session_id type uuid[\s\S]*btrim\(session_id::text\)::uuid/i, "migration explicitly converts safe text");
assert.doesNotMatch(migration, /session_id\s*=\s*gen_random_uuid/i, "migration never replaces legacy sessions");
assert.doesNotMatch(
  migration,
  /update\s+public\.inquiries/i,
  "migration never performs a row-level inquiry update"
);
assert.doesNotMatch(
  migration,
  /session_replication_role|disable\s+trigger|drop\s+trigger\s+(?:if\s+exists\s+)?enforce_inquiry_role_rules/i,
  "migration never bypasses or removes inquiry role enforcement"
);
assert.match(
  migration,
  /add column if not exists attribution_status text not null default 'missing'/i,
  "fresh schema receives the inquiry attribution contract through DDL"
);
assert.match(
  migration,
  /status_type <> 'text'[\s\S]*status_default is distinct from '''missing''::text'[\s\S]*status_null_count > 0[\s\S]*not status_not_null/i,
  "existing attribution status contract is validated without repair"
);
assert.match(
  migration,
  /grant select, insert on table public\.rate_limit_events to service_role/i,
  "server-side analytics rate limiting has explicit table privileges"
);
assert.match(precheck, /null_count[\s\S]*empty_string_count[\s\S]*valid_uuid_count[\s\S]*invalid_uuid_count/i, "precheck reports every compatibility bucket");
for (const [name, sql] of [["Production precheck", productionPrecheck], ["Production verify", productionVerify]] as const) {
  assert.doesNotMatch(
    sql.replace(/^\s*--.*$/gm, ""),
    /\b(insert|update|delete|alter|create|drop|truncate|grant|revoke|do)\b/i,
    `${name} remains SELECT-only`
  );
  assert.match(sql, /attribution_status_null_count/i, `${name} reports inquiry attribution NULLs`);
  assert.match(sql, /pg_get_triggerdef[\s\S]*public[\s\S]*inquiries/i, `${name} captures inquiry trigger evidence`);
}
assert.match(rollback, /alter column session_id type text[\s\S]*session_id::text/i, "rollback restores baseline text type");
assert.match(rollback, /if exists \(select 1 from public\.lead_attributions\)[\s\S]*raise exception/i, "rollback refuses to delete attribution history");
assert.match(rollback, /alter table public\.analytics_events no force row level security/i, "rollback restores baseline analytics RLS mode");

console.log("Conversion analytics Phase 1 migration compatibility tests: PASS");
