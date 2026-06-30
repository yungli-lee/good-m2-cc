import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const {
  canCreatePropertyTimeline,
  canManagePropertyTimeline,
  canReadPropertyTimeline,
  formatTimelineDate,
  getPropertyTimelineLabel,
  insertPropertyTimelineEvent,
  priceChangedContent,
  propertyTimelineCreatePath,
  propertyTimelineDeletePath,
  propertyTimelineFormSchema,
  sortPropertyTimelineEvents,
  timelineCreateRedirectPath
} = await import("../lib/properties/timeline.ts");
const {
  expiredListingTimelineContent,
  isListingExpired,
  selectExpiredPublishedListings
} = await import("../lib/properties/expire-listings.ts");

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

const insertedPayloads: unknown[] = [];
const successSupabase = {
  from(table: string) {
    assert.equal(table, "property_timeline_events");
    return {
      insert(payload: unknown) {
        insertedPayloads.push(payload);
        return {
          select(columns: string) {
            assert.equal(columns, "id");
            return {
              async single() {
                return { data: { id: "timeline-1" }, error: null };
              }
            };
          }
        };
      }
    };
  }
};

const insertSuccess = await insertPropertyTimelineEvent(successSupabase as unknown as Parameters<typeof insertPropertyTimelineEvent>[0], {
  property_id: "property-1",
  event_date: "2026-06-30",
  event_type: "follow_up",
  title: "追蹤屋主",
  content: "屋主確認可帶看",
  created_by: "user-1",
  created_by_email: "editor@example.com"
});

assert.equal(insertSuccess.data?.id, "timeline-1");
assert.equal(insertedPayloads.length, 1);
assert.equal(timelineCreateRedirectPath("property-1", insertSuccess), "/admin/properties/property-1/edit?timeline_saved=1");

const insertFailure = {
  data: null,
  error: { code: "42501", message: "new row violates row-level security policy" }
};

assert.equal(
  timelineCreateRedirectPath("property-1", insertFailure),
  "/admin/properties/property-1/edit?timeline_error=create_failed"
);
assert.notEqual(timelineCreateRedirectPath("property-1", insertFailure), "/admin/properties/property-1/edit?timeline_saved=1");
assert.equal(timelineCreateRedirectPath("property-1", { data: null, error: null }), "/admin/properties/property-1/edit?timeline_error=create_failed");

assert.equal(formatTimelineDate("2026-07-05"), "2026/07/05");
assert.equal(formatTimelineDate("2026/07/05"), "日期未設定");
assert.equal(formatTimelineDate(null), "日期未設定");
assert.equal(getPropertyTimelineLabel("showing").label, "帶看");
assert.equal(getPropertyTimelineLabel("unknown").label, "一般備註");
assert.equal(getPropertyTimelineLabel(null).icon, "📝");
assert.equal(propertyTimelineCreatePath("property-1"), "/admin/properties/property-1/edit/timeline");
assert.equal(propertyTimelineDeletePath("property-1", "event-1"), "/admin/properties/property-1/edit/timeline/event-1/delete");
assert.notEqual(propertyTimelineCreatePath("property-1"), "/admin/properties/property-1/edit");

const expiredListings = selectExpiredPublishedListings([
  { id: "published-expired", title: "已上架過期", status: "published", listing_end_date: "2026-06-29" },
  { id: "draft-expired", title: "草稿過期", status: "draft", listing_end_date: "2026-06-29" },
  { id: "published-active", title: "已上架未到期", status: "published", listing_end_date: "2026-07-01" },
  { id: "published-no-date", title: "已上架無日期", status: "published", listing_end_date: null }
], "2026-06-30");

assert.deepEqual(expiredListings.map((property) => property.id), ["published-expired"]);
assert.equal(isListingExpired("2026-06-29", "2026-06-30"), true);
assert.equal(isListingExpired("2026-06-30", "2026-06-30"), false);
assert.equal(expiredListingTimelineContent("2026-06-29"), "委託期限 2026/06/29 已到期，系統自動下架");

const queriesSource = readFileSync(new URL("../lib/properties/queries.ts", import.meta.url), "utf8");
const publicSelectSource = queriesSource.slice(queriesSource.indexOf("const publicPropertySelect"), queriesSource.indexOf("const featuredPropertySelect"));
const featuredSelectSource = queriesSource.slice(queriesSource.indexOf("const featuredPropertySelect"), queriesSource.indexOf("export async function listPublishedProperties"));
assert.doesNotMatch(publicSelectSource, /service_fee_rate|floor_price/);
assert.doesNotMatch(featuredSelectSource, /service_fee_rate|floor_price/);

console.log("property timeline tests passed");
