import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { registerHooks } from "node:module";
import { resolveSalesLineEnvironment, parseSalesReminderActivation, salesReminderRetryKey } from "../lib/sales-line-environment.ts";
import { runSalesReminderCron } from "../workers/sales-reminder-cron/index.ts";

const productionDb = "https://rlbuadkmylulieoryzal.supabase.co";
const previewDb = "https://niorteztdbuyusemsgwa.supabase.co";
const previewSite = "https://feature-sales-dual-track-pha.good-m2-cc.pages.dev";
const read = (values: Record<string, string>) => (name: string) => values[name] || "";
const production = { SALES_LINE_ENVIRONMENT: "production", NEXT_PUBLIC_SUPABASE_URL: productionDb };

assert.equal(resolveSalesLineEnvironment("https://good.m2.cc/api", read(production))?.environment, "production");
assert.equal(resolveSalesLineEnvironment(`${previewSite}/api`, read({ NEXT_PUBLIC_SUPABASE_URL: previewDb }))?.environment, "preview");
for (const [site, values] of [
  ["https://good.m2.cc/api", { NEXT_PUBLIC_SUPABASE_URL: productionDb }],
  ["https://good.m2.cc/api", { ...production, NEXT_PUBLIC_SUPABASE_URL: previewDb }],
  [`${previewSite}/api`, production],
  ["https://good.m2.cc.evil.example/api", production],
  ["https://evilgood-m2-cc.pages.dev/api", { NEXT_PUBLIC_SUPABASE_URL: previewDb }],
  ["http://good.m2.cc/api", production],
  ["https://good.m2.cc/api", { ...production, SUPABASE_URL: previewDb }],
  ["https://good.m2.cc/api", { ...production, NEXT_PUBLIC_SUPABASE_URL: `${productionDb}.evil.example` }]
] as Array<[string, Record<string, string>]>) {
  assert.equal(resolveSalesLineEnvironment(site, read(values)), null, `Reject ${site}`);
}
assert.equal(parseSalesReminderActivation("2026-10-12T10:00:00+08:00"), Date.parse("2026-10-12T02:00:00Z"));
assert.equal(parseSalesReminderActivation("2026-10-12T10:00:00"), null);
assert.equal(parseSalesReminderActivation("yesterday"), null);
const deadline = "2026-10-12T10:00:00+08:00";
const retry = await salesReminderRetryKey("production", "task-a", deadline);
assert.match(retry, /^[\da-f]{8}-[\da-f]{4}-5[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
assert.equal(retry, await salesReminderRetryKey("production", "task-a", "2026-10-12T02:00:00Z"));
assert.notEqual(retry, await salesReminderRetryKey("preview", "task-a", deadline));
assert.notEqual(retry, await salesReminderRetryKey("production", "task-a", "2026-10-12T03:00:00Z"));

let calls = 0;
const workerEnv = { SALES_LINE_ENVIRONMENT: "production", SALES_LINE_SITE_URL: "https://good.m2.cc", SALES_LINE_CRON_SECRET: "test-only-secret", SALES_LINE_CRON_ENABLED: "true" };
const mockSend: typeof fetch = async (input, init) => {
  calls++;
  assert.equal(input, "https://good.m2.cc/api/internal/sales-reminders");
  assert.equal(init?.method, "POST");
  assert.equal(init?.redirect, "error");
  assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-only-secret");
  return Response.json({ ok: true, claimed: 1, sent: 1, failed: 0 });
};
assert.equal((await runSalesReminderCron(workerEnv, mockSend)).sent, 1);
await runSalesReminderCron({ ...workerEnv, SALES_LINE_CRON_ENABLED: "false" }, mockSend);
assert.equal(calls, 1);
await assert.rejects(runSalesReminderCron({ ...workerEnv, SALES_LINE_SITE_URL: previewSite }, mockSend), /origin mismatch/);
await assert.rejects(runSalesReminderCron(workerEnv, async () => new Response(null, { status: 302 })), /302/);
await assert.rejects(runSalesReminderCron(workerEnv, async () => Response.json({ ok: true, failed: 1 })), /batch failed/);
assert.equal(calls, 1);

// Exercise the actual route handlers without contacting LINE or mutating either database.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    return nextResolve(specifier, context);
  }
});
Object.assign(process.env, production, { SALES_LINE_CRON_SECRET: "test-only-secret", LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: "test-only-token" });
delete process.env.SUPABASE_URL;
const { POST: reminders } = await import("../app/api/internal/sales-reminders/route.ts");
const request = () => new Request("https://good.m2.cc/api/internal/sales-reminders", { method: "POST", headers: { authorization: "Bearer test-only-secret" } });
delete process.env.SALES_LINE_REMINDERS_ENABLED;
assert.equal((await reminders(request())).status, 503);
process.env.SALES_LINE_REMINDERS_ENABLED = "true";
assert.equal((await reminders(new Request(request().url, { method: "POST" }))).status, 401);
process.env.SALES_LINE_REMINDERS_START_AT = "invalid";
assert.equal((await reminders(request())).status, 503);
process.env.SALES_LINE_REMINDERS_START_AT = "2099-01-01T00:00:00+08:00";
assert.equal((await (await reminders(request())).json()).reason, "not_started");
process.env.NEXT_PUBLIC_SUPABASE_URL = previewDb;
assert.equal((await reminders(request())).status, 403);
process.env.NEXT_PUBLIC_SUPABASE_URL = productionDb;

const realFetch = globalThis.fetch;
const claimedTask = { id: "11111111-1111-4111-8111-111111111111", title: "測試跟進", due_at: "2020-01-01T00:00:00+00:00", showing_at: null, person_id: null, property_id: "22222222-2222-4222-8222-222222222222", notes: "測試備註" };
let currentStatus = "open", currentDeadline = claimedTask.due_at, lineStatus = 200, saveStatus = 204;
let lineCalls = 0, sentMarkerWrites = 0;
let isBound = true;
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-service-key";
process.env.SALES_LINE_REMINDERS_START_AT = "2000-01-01T00:00:00Z";
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.host === "api.line.me") {
    lineCalls++;
    assert.equal(url.pathname, "/v2/bot/message/push");
    assert.match(new Headers(init?.headers).get("x-line-retry-key") || "", /^[\da-f-]{36}$/);
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.to, `U${"1".repeat(32)}`);
    assert.ok(payload.messages[0].text.includes("https://good.m2.cc/admin/sales-tasks"));
    return new Response(null, { status: lineStatus, headers: lineStatus === 409 ? { "x-line-accepted-request-id": "test-accepted" } : {} });
  }
  assert.equal(url.host, "rlbuadkmylulieoryzal.supabase.co");
  if (url.pathname.endsWith("/rpc/claim_due_sales_reminders")) return Response.json([claimedTask]);
  if (url.pathname.endsWith("/sales_follow_up_tasks")) {
    if (init?.method === "PATCH") {
      sentMarkerWrites++;
      assert.equal(JSON.parse(String(init.body)).line_reminder_sent_for, claimedTask.due_at);
      return saveStatus === 204 ? new Response(null, { status: 204 }) : Response.json({ message: "test persistence failure", code: "test" }, { status: saveStatus });
    }
    return Response.json([url.searchParams.get("select") === "assigned_to"
      ? { assigned_to: "33333333-3333-4333-8333-333333333333" }
      : { ...claimedTask, status: currentStatus, due_at: currentDeadline, line_reminder_sent_for: null }]);
  }
  if (url.pathname.endsWith("/sales_line_recipients")) return Response.json(isBound ? [{ line_user_id: `U${"1".repeat(32)}` }] : []);
  if (url.pathname.endsWith("/profiles")) {
    assert.equal(url.searchParams.get("deleted_at"), "is.null");
    return Response.json([{ role: "editor" }]);
  }
  throw new Error(`Unexpected test request: ${url.pathname}`);
};
try {
  assert.deepEqual(await (await reminders(request())).json(), { ok: true, claimed: 1, sent: 1, failed: 0 });
  assert.equal(lineCalls, 1);
  for (const status of ["completed", "cancelled"]) {
    currentStatus = status;
    assert.equal((await (await reminders(request())).json()).sent, 0);
  }
  currentStatus = "open";
  currentDeadline = "2020-01-02T00:00:00+00:00";
  assert.equal((await (await reminders(request())).json()).sent, 0);
  assert.equal(lineCalls, 1);
  currentDeadline = claimedTask.due_at;
  lineStatus = 409;
  assert.equal((await (await reminders(request())).json()).sent, 1);
  saveStatus = 503;
  assert.equal((await (await reminders(request())).json()).failed, 1);
  assert.equal(sentMarkerWrites, 3);
  saveStatus = 204;
  isBound = false;
  // No fallback from an unbound Editor to the legacy Owner LINE destination.
  process.env.LINE_SALES_RECIPIENT_ID = `U${"2".repeat(32)}`;
  // The missing-destination error update is different from a sent-marker write.
  const boundMock = globalThis.fetch;
  globalThis.fetch = async (input, init) => init?.method === "PATCH" && String(init.body).includes("Recipient LINE ID")
    ? new Response(null, { status: 204 }) : boundMock(input, init);
  const callsBefore = lineCalls;
  assert.equal((await (await reminders(request())).json()).failed, 1);
  assert.equal(lineCalls, callsBefore);
} finally {
  globalThis.fetch = realFetch;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const { POST: webhook } = await import("../app/api/line/sales-binding-webhook/route.ts");
process.env.LINE_MESSAGING_CHANNEL_SECRET = "test-only-channel-secret";
const raw = JSON.stringify({ events: [] });
const signature = createHmac("sha256", process.env.LINE_MESSAGING_CHANNEL_SECRET).update(raw).digest("base64");
const webhookRequest = (sig = signature, site = "https://good.m2.cc") => new Request(`${site}/api/line/sales-binding-webhook`, { method: "POST", headers: { "x-line-signature": sig }, body: raw });
delete process.env.SALES_LINE_BINDING_ENABLED;
assert.equal((await webhook(webhookRequest())).status, 503);
process.env.SALES_LINE_BINDING_ENABLED = "true";
assert.equal((await webhook(webhookRequest("invalid"))).status, 401);
assert.deepEqual(await (await webhook(webhookRequest())).json(), { ok: true, bound: 0 });
assert.equal((await webhook(webhookRequest(signature, previewSite))).status, 403);
delete process.env.SALES_LINE_ENVIRONMENT;
process.env.NEXT_PUBLIC_SUPABASE_URL = previewDb;
assert.deepEqual(await (await webhook(webhookRequest(signature, previewSite))).json(), { ok: true, bound: 0 });
console.log("Sales LINE production routing, disabled gates, webhook signatures, retry identity and Cron isolation PASS");
