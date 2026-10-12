type ReadConfig = (name: string) => string;
export type SalesLineEnvironment = "preview" | "production";

const databaseHosts = {
  preview: "niorteztdbuyusemsgwa.supabase.co",
  production: "rlbuadkmylulieoryzal.supabase.co"
};

// Explicit production opt-in plus an exact host/database pair. No substring checks.
export function resolveSalesLineEnvironment(requestUrl: string, read: ReadConfig): {
  environment: SalesLineEnvironment; databaseUrl: string; siteUrl: string;
} | null {
  const environment = read("SALES_LINE_ENVIRONMENT") || "preview";
  if (environment !== "preview" && environment !== "production") return null;
  try {
    const site = new URL(requestUrl);
    const databaseUrl = read("SUPABASE_URL") || read("NEXT_PUBLIC_SUPABASE_URL");
    const database = new URL(databaseUrl);
    if (site.protocol !== "https:" || site.port || site.username || site.password) return null;
    if (database.protocol !== "https:" || database.host !== databaseHosts[environment] ||
        database.username || database.password || database.pathname !== "/" || database.search || database.hash) return null;
    // Reject conflicting runtime aliases instead of silently using one database.
    const publicUrl = read("NEXT_PUBLIC_SUPABASE_URL");
    if (publicUrl && new URL(publicUrl).origin !== database.origin) return null;
    const allowedSite = environment === "production"
      ? site.hostname === "good.m2.cc"
      : site.hostname === "good-m2-cc.pages.dev" || site.hostname.endsWith(".good-m2-cc.pages.dev");
    if (!allowedSite) return null;
    return { environment, databaseUrl: database.origin, siteUrl: site.origin };
  } catch {
    return null;
  }
}

export function parseSalesReminderActivation(value: string) {
  // Require an explicit timezone; a dashboard-local date must never be interpreted as UTC.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export async function salesReminderRetryKey(environment: SalesLineEnvironment, taskId: string, dueAt: string) {
  const value = `${environment}:${taskId}:${new Date(dueAt).toISOString()}`;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  // Deterministic UUID: the same task/deadline keeps its LINE retry identity.
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = Array.from(digest.slice(0, 16), byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
