import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-api";
import { parseAnalyticsRange } from "@/lib/analytics-dashboard/date-range";
import { getDashboardEnvironment } from "@/lib/analytics-dashboard/environment";
import { getAnalyticsRecentInquiries } from "@/lib/analytics-dashboard/recent-inquiries";

export const runtime = "edge";
const response = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "owner"]);
  if (auth.response) { auth.response.headers.set("cache-control", "private, no-store"); return auth.response; }
  const range = parseAnalyticsRange(new URL(request.url).searchParams.get("range"));
  try {
    return response({ ok: true, data: await getAnalyticsRecentInquiries(range, getDashboardEnvironment()) });
  } catch (error) {
    console.error("[analytics_recent_inquiries_failed]", { name: error instanceof Error ? error.name : "unknown", reason: "query_failed" });
    return response({ ok: false, error: "analytics_recent_inquiries_unavailable" }, 500);
  }
}
