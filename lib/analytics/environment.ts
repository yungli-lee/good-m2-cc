export type AnalyticsEnvironment = "preview" | "production" | "development" | "test";

export function getAnalyticsEnvironment(): AnalyticsEnvironment {
  if (process.env.NODE_ENV === "test") return "test";
  const branch = process.env.CF_PAGES_BRANCH || process.env.NEXT_PUBLIC_CF_PAGES_BRANCH || "";
  if (process.env.NODE_ENV === "production") return branch === "main" ? "production" : "preview";
  return "development";
}

export function getAnalyticsStorageNamespace(environment = getAnalyticsEnvironment()) {
  return environment === "production" ? "production" : environment === "preview" ? "preview" : environment;
}
