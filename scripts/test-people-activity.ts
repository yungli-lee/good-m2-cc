import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dateInputToTaipeiIso } from "../lib/format.ts";

const activityRoute = readFileSync("app/api/admin/people-activities/route.ts", "utf8");
const detailPage = readFileSync("app/admin/people/[id]/page.tsx", "utf8");

assert.match(activityRoute, /export const runtime = "edge"/);
assert.match(activityRoute, /export async function POST/);
assert.match(activityRoute, /UNAUTHENTICATED/);
assert.match(activityRoute, /ACTIVITY_FORBIDDEN/);
assert.match(activityRoute, /INVALID_PERSON_ID/);
assert.match(activityRoute, /PERSON_NOT_FOUND/);
assert.match(activityRoute, /ACTIVITY_SAVE_FAILED/);
assert.match(activityRoute, /status: 201/);
assert.match(detailPage, /listPersonActivities\(supabase, id\)/);
assert.equal(dateInputToTaipeiIso("2026-07-31"), "2026-07-31T00:00:00+08:00");
assert.equal(dateInputToTaipeiIso("invalid"), null);

console.log("people activity validation: PASS");
