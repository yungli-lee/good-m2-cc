import { z } from "zod";

const safeString = (max: number) => z.string().trim().max(max).nullable().optional();
const propertySchemas = {
  page_view: z.object({}).strict(),
  view_property: z.object({ property_title: z.string().max(200), property_category: safeString(80), city: safeString(80), district: safeString(80), price: z.number().nonnegative().nullable(), listing_status: safeString(40) }).strict(),
  view_property_media: z.object({ media_type: z.enum(["image", "video"]), media_index: z.number().int().nonnegative(), action: z.enum(["open", "view", "play"]) }).strict(),
  view_knowledge: z.object({ article_id: z.string().uuid(), slug: z.string().max(200), category: safeString(100) }).strict(),
  search_property: z.object({ query: safeString(200), district: safeString(80), category: safeString(80), price_min: z.number().nonnegative().nullable().optional(), price_max: z.number().nonnegative().nullable().optional(), result_count: z.number().int().nonnegative() }).strict(),
  filter_property: z.object({ filter_name: z.string().max(80), filter_value: z.string().max(160), result_count: z.number().int().nonnegative() }).strict(),
  open_map: z.object({ map_provider: z.string().max(40), cta_location: z.string().max(80) }).strict(),
  share_property: z.object({ share_channel: z.string().max(40), cta_location: z.string().max(80) }).strict(),
  use_calculator: z.object({ calculator_type: z.string().max(80), completed: z.boolean() }).strict(),
  click_line: z.object({ contact_person: safeString(80), cta_location: z.string().max(80) }).strict(),
  click_phone: z.object({ contact_person: safeString(80), cta_location: z.string().max(80) }).strict(),
  start_inquiry: z.object({ form_type: z.string().max(50), form_location: z.string().max(80) }).strict(),
  submit_inquiry: z.object({ form_type: z.string().max(50), form_location: z.string().max(80) }).strict()
} as const;

export const publicEventNames = Object.keys(propertySchemas) as Array<keyof typeof propertySchemas>;

const sensitiveKey = /^(name|phone|email|message|password|token|cookie|dom|html|form_data)$/i;
function containsSensitiveKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsSensitiveKey);
  return Object.entries(value as Record<string, unknown>).some(([key, child]) => sensitiveKey.test(key) || containsSensitiveKey(child));
}

export const analyticsEventRequestSchema = z.object({
  event_id: z.string().uuid(), event_name: z.enum(publicEventNames as [string, ...string[]]), event_version: z.literal(1), occurred_at: z.string().datetime(),
  visitor_id: z.string().uuid(), session_id: z.string().uuid(), page_path: z.string().startsWith("/").max(500), referrer: safeString(500),
  utm_source: safeString(120), utm_medium: safeString(120), utm_campaign: safeString(160), utm_content: safeString(160), utm_term: safeString(160),
  device_class: z.enum(["desktop", "mobile", "tablet", "unknown"]), property_id: z.string().uuid().nullable().optional(), event_properties: z.record(z.string(), z.unknown())
}).strict().superRefine((value, context) => {
  if (containsSensitiveKey(value.event_properties)) context.addIssue({ code: "custom", path: ["event_properties"], message: "sensitive_property_key" });
  const schema = propertySchemas[value.event_name as keyof typeof propertySchemas];
  const result = schema?.safeParse(value.event_properties);
  if (!result?.success) context.addIssue({ code: "custom", path: ["event_properties"], message: "invalid_event_properties" });
});

export type AnalyticsEventRequest = z.infer<typeof analyticsEventRequestSchema>;
