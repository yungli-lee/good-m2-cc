import {
  analyticsMetadataMaxBytes,
  analyticsPathMaxLength,
  analyticsReferrerMaxLength,
  analyticsSearchQueryMaxLength,
  analyticsSessionIdMaxLength
} from "@/lib/analytics/constants";
import type { AnalyticsEventInput } from "@/lib/analytics/types";

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const taiwanPhonePattern = /(?:\+?886[-\s]?)?0?9\d{2}[-\s]?\d{3}[-\s]?\d{3}|0\d{1,2}[-\s]?\d{6,8}/g;
const taiwanIdPattern = /[A-Z][12]\d{8}/gi;

function truncate(value: string | null | undefined, maxLength: number) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : null;
}

export function sanitizeAnalyticsSearchQuery(value?: string | null) {
  const query = truncate(value, analyticsSearchQueryMaxLength);
  if (!query) return null;
  return query
    .replace(emailPattern, "[email]")
    .replace(taiwanPhonePattern, "[phone]")
    .replace(taiwanIdPattern, "[id]");
}

export function sanitizeAnalyticsMetadata(value?: Record<string, unknown> | null) {
  if (!value) return {};
  const json = JSON.stringify(value);
  if (new TextEncoder().encode(json).length <= analyticsMetadataMaxBytes) return value;
  return { truncated: true };
}

export function sanitizeAnalyticsEventInput(input: AnalyticsEventInput): AnalyticsEventInput {
  return {
    ...input,
    entity_type: truncate(input.entity_type, 80),
    page_path: truncate(input.page_path, analyticsPathMaxLength),
    search_query: sanitizeAnalyticsSearchQuery(input.search_query),
    referrer: truncate(input.referrer, analyticsReferrerMaxLength),
    utm_source: truncate(input.utm_source, 120),
    utm_medium: truncate(input.utm_medium, 120),
    utm_campaign: truncate(input.utm_campaign, 160),
    device_type: truncate(input.device_type, 40),
    browser: truncate(input.browser, 80),
    ip_hash: truncate(input.ip_hash, 128),
    user_agent_hash: truncate(input.user_agent_hash, 128),
    session_id: truncate(input.session_id, analyticsSessionIdMaxLength),
    metadata: sanitizeAnalyticsMetadata(input.metadata)
  };
}
