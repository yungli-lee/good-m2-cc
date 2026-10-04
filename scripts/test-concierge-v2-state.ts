import assert from "node:assert/strict";
import { needsSchema } from "../lib/concierge/schema.ts";
import { emptyConciergeState } from "../lib/concierge/state.ts";
import { advanceConciergeState, intentFromAction } from "../lib/concierge/state-engine.ts";

const needs = needsSchema.parse({ intent: "buy", districts: ["鹿港鎮"], type: "residential", maxPrice: 2000 });
const initial = emptyConciergeState(needs);
assert.equal(initial.version, 2);
assert.equal(initial.turnCount, 0);
assert.deepEqual(initial.rejectedSlugs, []);

const searching = advanceConciergeState({
  previous: initial,
  intent: "search",
  needs,
  candidateSlugs: ["a", "b", "c"]
});
assert.equal(searching.turnCount, 1);
assert.deepEqual(searching.consideringSlugs, ["a", "b", "c"]);

const focused = advanceConciergeState({
  previous: searching,
  intent: "property_question",
  needs,
  focusedSlug: "b",
  candidateSlugs: ["b"]
});
assert.equal(focused.focusedSlug, "b");
assert.ok(focused.consideringSlugs.includes("b"));

const rejected = advanceConciergeState({
  previous: focused,
  intent: "reject_property",
  needs,
  rejectedSlug: "b",
  candidateSlugs: ["a", "c"]
});
assert.equal(rejected.focusedSlug, null);
assert.ok(rejected.rejectedSlugs.includes("b"));
assert.ok(!rejected.consideringSlugs.includes("b"));
assert.deepEqual(rejected.requirements, needs);

const viewing = advanceConciergeState({
  previous: rejected,
  intent: "viewing",
  needs,
  focusedSlug: "a"
});
assert.equal(viewing.viewingStage, "direct");
assert.equal(viewing.focusedSlug, "a");

const declined = advanceConciergeState({
  previous: viewing,
  intent: "property_question",
  needs,
  focusedSlug: "a",
  viewingDeclined: true
});
assert.equal(declined.viewingStage, "declined");

const reconsidered = advanceConciergeState({
  previous: rejected,
  intent: "reconsider_property",
  needs,
  focusedSlug: "b",
  revivedSlug: "b"
});
assert.equal(reconsidered.focusedSlug, "b");
assert.ok(!reconsidered.rejectedSlugs.includes("b"));
assert.ok(reconsidered.consideringSlugs.includes("b"));

assert.equal(intentFromAction("search"), "search");
assert.equal(intentFromAction("property"), "property_question");
assert.equal(intentFromAction("property", true), "reject_property");
assert.equal(intentFromAction("viewing"), "viewing");
assert.equal(intentFromAction("offer"), "offer");

console.log("PASS concierge v2 state persistence transitions");
