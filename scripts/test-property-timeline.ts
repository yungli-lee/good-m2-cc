import assert from "node:assert/strict";

const {
  canCreatePropertyTimeline,
  canManagePropertyTimeline,
  canReadPropertyTimeline,
  priceChangedContent,
  propertyTimelineFormSchema,
  sortPropertyTimelineEvents
} = await import("../lib/properties/timeline.ts");

const validTypes = [
  "created",
  "published",
  "unpublished",
  "featured",
  "unfeatured",
  "price_changed",
  "showing",
  "offer",
  "negotiation",
  "follow_up",
  "closed",
  "note"
];

for (const eventType of validTypes) {
  assert.equal(
    propertyTimelineFormSchema.safeParse({
      event_date: "2026-06-30",
      event_type: eventType,
      title: "測試事件",
      content: ""
    }).success,
    true,
    `${eventType} should be accepted`
  );
}

assert.equal(
  propertyTimelineFormSchema.safeParse({
    event_date: "2026-06-30",
    event_type: "invalid",
    title: "測試事件",
    content: ""
  }).success,
  false
);

assert.equal(
  propertyTimelineFormSchema.safeParse({
    event_date: "2026/06/30",
    event_type: "note",
    title: "測試事件",
    content: ""
  }).success,
  false
);

const sorted = sortPropertyTimelineEvents([
  { event_date: "2026-07-01", created_at: "2026-07-01T01:00:00Z" },
  { event_date: "2026-07-05", created_at: "2026-07-05T01:00:00Z" },
  { event_date: "2026-07-05", created_at: "2026-07-05T03:00:00Z" },
  { event_date: "2026-06-29", created_at: "2026-06-29T01:00:00Z" }
]);

assert.deepEqual(sorted.map((event) => `${event.event_date}/${event.created_at}`), [
  "2026-07-05/2026-07-05T03:00:00Z",
  "2026-07-05/2026-07-05T01:00:00Z",
  "2026-07-01/2026-07-01T01:00:00Z",
  "2026-06-29/2026-06-29T01:00:00Z"
]);

assert.equal(canReadPropertyTimeline("viewer"), false);
assert.equal(canCreatePropertyTimeline("viewer"), false);
assert.equal(canManagePropertyTimeline("viewer"), false);

for (const role of ["owner", "admin", "editor"] as const) {
  assert.equal(canReadPropertyTimeline(role), true, `${role} should read timeline`);
  assert.equal(canCreatePropertyTimeline(role), true, `${role} should create timeline`);
}

assert.equal(canManagePropertyTimeline("owner"), true);
assert.equal(canManagePropertyTimeline("admin"), true);
assert.equal(canManagePropertyTimeline("editor"), false);
assert.equal(priceChangedContent(988, 958), "開價 988 萬 → 958 萬");

console.log("property timeline tests passed");
