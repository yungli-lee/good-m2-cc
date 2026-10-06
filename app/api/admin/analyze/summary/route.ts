import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-api";
import { parseAnalyticsRange } from "@/lib/analytics-dashboard/date-range";
import { getDashboardEnvironment } from "@/lib/analytics-dashboard/environment";
import { getAnalyticsSummary } from "@/lib/analytics-dashboard/summary";

export const runtime = "edge";

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "owner"]);
  if (auth.response) {
    auth.response.headers.set("cache-control", "private, no-store");
    return auth.response;
  }
  const range = parseAnalyticsRange(new URL(request.url).searchParams.get("range"));

  try {
    const data = await getAnalyticsSummary(range, getDashboardEnvironment());
    return response({ ok: true, data });
  } catch (error) {
    console.error("[analytics_summary_failed]", {
      name: error instanceof Error ? error.name : "unknown",
      reason: error instanceof Error && error.message === "analytics_range_too_large" ? "range_too_large" : "query_failed"
    });
    return response({ ok: false, error: "analytics_summary_unavailable" }, 500);
  }
}
