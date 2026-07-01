import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeAnalyticsEventInput } from "@/lib/analytics/sanitize";
import type { AnalyticsEventInput, RecordAnalyticsEventResult } from "@/lib/analytics/types";

export async function recordAnalyticsEvent(
  supabase: SupabaseClient,
  input: AnalyticsEventInput
): Promise<RecordAnalyticsEventResult> {
  const payload = sanitizeAnalyticsEventInput(input);
  const { data, error } = await supabase
    .from("analytics_events")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.code || "analytics_event_insert_failed" };
  }

  return { ok: true, id: data?.id as string | undefined };
}
