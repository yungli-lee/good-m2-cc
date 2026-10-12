export type SalesCronEnv = {
  SALES_LINE_ENVIRONMENT?: string;
  SALES_LINE_CRON_ENABLED?: string;
  SALES_LINE_SITE_URL?: string;
  SALES_LINE_CRON_SECRET?: string;
};

export async function runSalesReminderCron(env: SalesCronEnv, send: typeof fetch = fetch) {
  if (env.SALES_LINE_CRON_ENABLED !== "true") return { ok: true, reason: "disabled" };
  const environment = env.SALES_LINE_ENVIRONMENT;
  if (environment !== "production" && environment !== "preview") throw new Error("Invalid sales environment");
  const site = new URL(env.SALES_LINE_SITE_URL || "");
  const allowed = environment === "production"
    ? site.hostname === "good.m2.cc"
    : site.hostname === "good-m2-cc.pages.dev" || site.hostname.endsWith(".good-m2-cc.pages.dev");
  if (!allowed || site.protocol !== "https:" || site.port || site.username || site.password ||
      site.pathname !== "/" || site.search || site.hash) throw new Error("Sales cron origin mismatch");
  if (!env.SALES_LINE_CRON_SECRET?.trim()) throw new Error("Missing sales cron secret");
  const response = await send(`${site.origin}/api/internal/sales-reminders`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.SALES_LINE_CRON_SECRET.trim()}` },
    // Workers supports manual; reject any 3xx below without forwarding the bearer token.
    redirect: "manual",
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error(`Sales reminder endpoint returned ${response.status}`);
  const result = await response.json() as { ok?: boolean; claimed?: number; sent?: number; failed?: number; reason?: string };
  if (result.ok !== true || (result.failed || 0) > 0) throw new Error("Sales reminder batch failed; inspect task delivery errors");
  // Counts only: never log the bearer token, LINE IDs, task notes or customer data.
  return { ok: true, claimed: result.claimed || 0, sent: result.sent || 0, reason: result.reason };
}

const worker = {
  async scheduled(_event: unknown, env: SalesCronEnv) {
    console.log("sales_reminder_cron", await runSalesReminderCron(env));
  }
};

export default worker;
