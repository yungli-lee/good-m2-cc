import { getAnalyticsEnvironment } from "@/lib/analytics/environment";
import type { DashboardEnvironment } from "./contracts.ts";

export function getDashboardEnvironment(): DashboardEnvironment {
  return getAnalyticsEnvironment() === "production" ? "production" : "preview";
}
