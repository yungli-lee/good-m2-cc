import assert from "node:assert/strict";
import { relationInputSchema, relationshipTypes } from "../lib/people-properties.ts";

const ids = { person_id: "00000000-0000-0000-0000-000000000001", property_id: "00000000-0000-0000-0000-000000000002" };
const valid = { ...ids, relationship_type: "buyer", relationship_label: "", note: "看屋", started_at: "2026-01-01", ended_at: "" };
assert.equal(relationInputSchema.safeParse(valid).success, true);
assert.equal(relationInputSchema.safeParse({ ...valid, relationship_type: "invalid" }).success, false);
assert.equal(relationInputSchema.safeParse({ ...valid, relationship_type: "other", relationship_label: "" }).success, false);
assert.equal(relationInputSchema.safeParse({ ...valid, started_at: "2026-02-01", ended_at: "2026-01-01" }).success, false);
assert.equal(relationInputSchema.safeParse({ ...valid, person_id: "not-a-uuid" }).success, false);
assert.deepEqual(relationshipTypes, ["owner", "buyer", "viewer", "negotiator", "tenant", "landlord", "referrer", "contact", "other"]);
console.log("people-property relation validation: PASS");
