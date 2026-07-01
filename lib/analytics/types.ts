import type {
  analyticsDeviceTypes,
  analyticsEntityTypes,
  analyticsEventNames
} from "@/lib/analytics/constants";

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type AnalyticsEntityType = (typeof analyticsEntityTypes)[number];
export type AnalyticsDeviceType = (typeof analyticsDeviceTypes)[number];

export type AnalyticsEventInput = {
  event_name: AnalyticsEventName;
  entity_type?: AnalyticsEntityType | string | null;
  entity_id?: string | null;
  page_path?: string | null;
  search_query?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  device_type?: AnalyticsDeviceType | string | null;
  browser?: string | null;
  ip_hash?: string | null;
  user_agent_hash?: string | null;
  session_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AnalyticsEvent = AnalyticsEventInput & {
  id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type RecordAnalyticsEventResult = {
  ok: boolean;
  id?: string;
  error?: string;
};
