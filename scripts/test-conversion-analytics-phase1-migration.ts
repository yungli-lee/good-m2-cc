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
const rollback = readFileSync(new URL("./sql/conversion-analytics-phase1-rollback.sql", import.meta.url), "utf8");

assert.match(migration, /session_udt = 'uuid'/, "migration has UUID rerun branch");
assert.match(migration, /session_udt = 'text'/, "migration has text conversion branch");
assert.match(migration, /invalid_count > 0[\s\S]*raise exception/i, "invalid legacy data aborts transaction");
assert.match(migration, /alter column session_id type uuid[\s\S]*btrim\(session_id::text\)::uuid/i, "migration explicitly converts safe text");
assert.doesNotMatch(migration, /session_id\s*=\s*gen_random_uuid/i, "migration never replaces legacy sessions");
assert.match(
  migration,
  /grant select, insert on table public\.rate_limit_events to service_role/i,
  "server-side analytics rate limiting has explicit table privileges"
);
assert.match(precheck, /null_count[\s\S]*empty_string_count[\s\S]*valid_uuid_count[\s\S]*invalid_uuid_count/i, "precheck reports every compatibility bucket");
assert.match(rollback, /alter column session_id type text[\s\S]*session_id::text/i, "rollback restores baseline text type");

console.log("Conversion analytics Phase 1 migration compatibility tests: PASS");
