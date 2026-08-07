import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sourceFromLocation } from "../lib/analytics/acquisition.ts";
import { ANALYTICS_SESSION_TIMEOUT_MS, getAnalyticsIdentity } from "../lib/analytics/identity.ts";
import { analyticsEventRequestSchema } from "../lib/analytics/schemas.ts";
import { selectAttributionTouches } from "../lib/analytics/attribution-rules.ts";

class StorageMock {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  clear() { this.values.clear(); }
}

const storage = new StorageMock();
Object.defineProperty(globalThis, "window", { value: { localStorage: storage }, configurable: true });

const first = getAnalyticsIdentity(1_000, "preview")!;
const reload = getAnalyticsIdentity(10_000, "preview")!;
assert.equal(first.visitorId, reload.visitorId, "visitor persists on reload");
assert.equal(first.sessionId, reload.sessionId, "session persists inside 30 minutes");
const expired = getAnalyticsIdentity(10_000 + ANALYTICS_SESSION_TIMEOUT_MS + 1, "preview")!;
assert.equal(first.visitorId, expired.visitorId, "visitor survives session timeout");
assert.notEqual(first.sessionId, expired.sessionId, "session rotates after inactivity");
const production = getAnalyticsIdentity(12_000, "production")!;
assert.notEqual(first.visitorId, production.visitorId, "preview and production visitors are isolated");
Object.defineProperty(globalThis, "window", { value: { localStorage: { getItem() { throw new Error("disabled"); }, setItem() { throw new Error("disabled"); } } }, configurable: true });
const disabledStorage = getAnalyticsIdentity(13_000, "development")!;
assert.equal(disabledStorage.storage, "memory", "storage-disabled mode safely falls back to memory");
const savedWindow = globalThis.window;
Reflect.deleteProperty(globalThis, "window");
assert.equal(getAnalyticsIdentity(14_000, "test"), null, "SSR does not access window");
Object.defineProperty(globalThis, "window", { value: savedWindow, configurable: true });

const facebook = sourceFromLocation(new URL("https://preview.example/properties/home?utm_source=Facebook&utm_medium=Social&utm_campaign= Test "), null);
assert.equal(facebook.source, "facebook");
assert.equal(facebook.medium, "social");
assert.equal(facebook.campaign, "Test");
const internal = sourceFromLocation(new URL("https://preview.example/properties/home"), "https://preview.example/");
assert.equal(internal.source, "direct");
assert.equal(internal.referrer, null, "internal referrer is not acquisition");

const base = {
  event_id: "550e8400-e29b-41d4-a716-446655440000", event_name: "click_line", event_version: 1,
  occurred_at: "2026-08-06T00:00:00.000Z", visitor_id: "550e8400-e29b-41d4-a716-446655440001",
  session_id: "550e8400-e29b-41d4-a716-446655440002", page_path: "/properties/test", referrer: null,
  utm_source: "facebook", utm_medium: "social", utm_campaign: "test", utm_content: null, utm_term: null,
  device_class: "mobile", property_id: "550e8400-e29b-41d4-a716-446655440003",
  event_properties: { contact_person: null, cta_location: "property" }
};
assert.equal(analyticsEventRequestSchema.safeParse(base).success, true, "valid event passes");
assert.equal(analyticsEventRequestSchema.safeParse({ ...base, event_name: "unknown" }).success, false, "unknown event rejects");
assert.equal(analyticsEventRequestSchema.safeParse({ ...base, visitor_id: "bad" }).success, false, "invalid UUID rejects");
assert.equal(analyticsEventRequestSchema.safeParse({ ...base, environment: "production" }).success, false, "client-controlled environment rejects");
assert.equal(analyticsEventRequestSchema.safeParse({ ...base, event_properties: { ...base.event_properties, nested: { email: "private@example.com" } } }).success, false, "nested sensitive key rejects");
assert.equal(analyticsEventRequestSchema.safeParse({ ...base, event_properties: { ...base.event_properties, unknown: true } }).success, false, "unknown event property rejects");

const event = (id: string, source: string | null, session: string, time: string) => ({ id, event_id: id, session_id: session, property_id: null, utm_source: source, utm_medium: null, utm_campaign: null, occurred_at: time });
const direct = event("550e8400-e29b-41d4-a716-446655440010", "direct", "s2", "2026-08-02T00:00:00Z");
const fb = event("550e8400-e29b-41d4-a716-446655440011", "facebook", "s1", "2026-08-01T00:00:00Z");
const touches = selectAttributionTouches([fb, direct], [direct]);
assert.equal(touches.first?.utm_source, "facebook", "first touch prefers earliest non-direct");
assert.equal(touches.lead?.utm_source, "direct", "lead touch uses inquiry session landing");
assert.equal(touches.lastNonDirect?.utm_source, "facebook", "last non-direct survives direct return");

const route = readFileSync(new URL("../app/api/analytics/events/route.ts", import.meta.url), "utf8");
const inquiryRoute = readFileSync(new URL("../app/api/public/inquiries/route.ts", import.meta.url), "utf8");
assert.match(route, /MAX_PAYLOAD_BYTES = 8 \* 1024/);
assert.match(route, /error\?\.code === "23505"/);
assert.match(route, /source_system: "web_client"/);
assert.match(route, /environment: getAnalyticsEnvironment\(\)/);
assert.doesNotMatch(route, /serviceRoleKey.*NextResponse/);
assert.match(inquiryRoute, /visitor_id: input\.visitor_id \|\| null/);
assert.match(inquiryRoute, /attribution_status: input\.visitor_id && input\.session_id \? "pending" : "missing"/);
assert.doesNotMatch(inquiryRoute, /input\.attribution_status/);

console.log("Conversion analytics Phase 1 application tests: PASS");
