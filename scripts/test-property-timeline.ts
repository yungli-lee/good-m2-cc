import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const {
  canCreatePropertyTimeline,
  canManagePropertyTimeline,
  canReadPropertyTimeline,
  canUpdatePropertyTimeline,
  formatTimelineDate,
  getPropertyTimelineLabel,
  insertPropertyTimelineEvent,
  priceChangedContent,
  propertyTimelineCreatePath,
  propertyTimelineDeletePath,
  propertyTimelineUpdatePath,
  propertyTimelineFormSchema,
  sortPropertyTimelineEvents,
  timelineCreateRedirectPath,
  timelineUpdateRedirectPath,
  updatePropertyTimelineEvent
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
assert.equal(canUpdatePropertyTimeline("viewer"), false);

for (const role of ["owner", "admin", "editor"] as const) {
  assert.equal(canReadPropertyTimeline(role), true, `${role} should read timeline`);
  assert.equal(canCreatePropertyTimeline(role), true, `${role} should create timeline`);
  assert.equal(canUpdatePropertyTimeline(role), true, `${role} should update timeline`);
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

const updatePayloads: unknown[] = [];
const updateSupabase = {
  from(table: string) {
    assert.equal(table, "property_timeline_events");
    return {
      update(payload: unknown) {
        updatePayloads.push(payload);
        return {
          eq(field: string, value: string) {
            assert.ok(["id", "property_id"].includes(field));
            assert.ok(value);
            return this;
          },
          select(columns: string) {
            assert.equal(columns, "id");
            return {
              async single() {
                return { data: { id: "event-1" }, error: null };
              }
            };
          }
        };
      }
    };
  }
};

const updateSuccess = await updatePropertyTimelineEvent(updateSupabase as unknown as Parameters<typeof updatePropertyTimelineEvent>[0], "property-1", "event-1", {
  event_date: "2026-06-30",
  event_type: "showing",
  title: "帶看更新",
  content: "已更新內容",
  updated_by: "user-1"
});
assert.equal(updateSuccess.data?.id, "event-1");
assert.equal(updatePayloads.length, 1);
assert.equal(timelineUpdateRedirectPath("property-1", updateSuccess), "/admin/properties/property-1/edit?timeline_updated=1");
assert.equal(timelineUpdateRedirectPath("property-1", { data: null, error: { code: "42501" } }), "/admin/properties/property-1/edit?timeline_error=update_failed");

assert.equal(formatTimelineDate("2026-07-05"), "2026/07/05");
assert.equal(formatTimelineDate("2026/07/05"), "日期未設定");
assert.equal(formatTimelineDate(null), "日期未設定");
assert.equal(getPropertyTimelineLabel("showing").label, "帶看");
assert.equal(getPropertyTimelineLabel("unknown").label, "一般備註");
assert.equal(getPropertyTimelineLabel(null).icon, "📝");
assert.equal(propertyTimelineCreatePath("property-1"), "/admin/properties/property-1/edit/timeline");
assert.equal(propertyTimelineDeletePath("property-1", "event-1"), "/admin/properties/property-1/edit/timeline/event-1/delete");
assert.equal(propertyTimelineUpdatePath("property-1", "event-1"), "/admin/properties/property-1/edit/timeline/event-1/update");
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

const aiFormSource = readFileSync(new URL("../components/admin/ai-property-form.tsx", import.meta.url), "utf8");
const propertyFormSource = readFileSync(new URL("../components/admin/property-form.tsx", import.meta.url), "utf8");
const propertyMediaManagerSource = readFileSync(new URL("../components/admin/property-media-manager.tsx", import.meta.url), "utf8");
const editUploadRouteSource = readFileSync(new URL("../app/admin/properties/[id]/edit/upload/route.ts", import.meta.url), "utf8");
const propertyActionsSource = readFileSync(new URL("../app/admin/properties/actions.ts", import.meta.url), "utf8");
const adminGrantMigrationSource = readFileSync(new URL("../supabase/migrations/202606300103_fix_property_admin_grants.sql", import.meta.url), "utf8");
for (const label of ["建地", "房屋", "農林漁牧地", "工業用地", "廠房", "大廈", "公寓"]) {
  assert.match(aiFormSource, new RegExp(label));
  assert.match(propertyFormSource, new RegExp(label));
}
for (const label of ["透天", "土地", "店面", "其他"]) {
  assert.doesNotMatch(aiFormSource.slice(aiFormSource.indexOf("const typeOptions"), aiFormSource.indexOf("function setFormValue")), new RegExp(`"${label}"`));
  assert.doesNotMatch(propertyFormSource.slice(propertyFormSource.indexOf("const typeOptions"), propertyFormSource.indexOf("export function PropertyForm")), new RegExp(`"${label}"`));
}

assert.match(aiFormSource, /multiple/);
assert.match(propertyMediaManagerSource, /multiple/);
assert.match(aiFormSource, /selectedFilesRef/);
assert.match(propertyMediaManagerSource, /selectedFilesRef/);
assert.match(editUploadRouteSource, /formData\.getAll\("file"\)/);
assert.match(propertyActionsSource, /formData\.getAll\("file"\)/);
assert.match(adminGrantMigrationSource, /grant select, insert, update, delete on table public\.properties to authenticated;/);
assert.match(adminGrantMigrationSource, /grant select, insert, update, delete on table public\.property_media to authenticated;/);
assert.match(adminGrantMigrationSource, /public\.is_admin_role\(array\['admin','owner'\]\)/);

const timelineCompanyMigrationSource = readFileSync(new URL("../supabase/migrations/202606300104_timeline_edit_and_company_settings.sql", import.meta.url), "utf8");
const companySettingsSource = readFileSync(new URL("../lib/company-settings.ts", import.meta.url), "utf8");
assert.match(timelineCompanyMigrationSource, /add column if not exists updated_by uuid/);
assert.match(timelineCompanyMigrationSource, /staff update property timeline/);
assert.match(timelineCompanyMigrationSource, /create table if not exists public\.company_settings/);
assert.match(timelineCompanyMigrationSource, /public read company settings/);
assert.match(companySettingsSource, /赫成開發有限公司/);
assert.match(companySettingsSource, /太平洋房屋彰化縣府加盟店/);

console.log("property timeline tests passed");
