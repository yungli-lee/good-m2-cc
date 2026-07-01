export const analyticsEventNames = [
  "property_view",
  "property_search",
  "knowledge_view",
  "line_click",
  "phone_click",
  "inquiry_submit",
  "featured_property_click",
  "share_click",
  "media_view",
  "admin_login"
] as const;

export const analyticsEntityTypes = [
  "property",
  "knowledge",
  "media",
  "inquiry",
  "admin",
  "company",
  "page"
] as const;

export const analyticsDeviceTypes = [
  "desktop",
  "mobile",
  "tablet",
  "bot",
  "unknown"
] as const;

export const analyticsSearchQueryMaxLength = 300;
export const analyticsPathMaxLength = 500;
export const analyticsReferrerMaxLength = 500;
export const analyticsSessionIdMaxLength = 120;
export const analyticsMetadataMaxBytes = 4096;
