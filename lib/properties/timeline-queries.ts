import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sortPropertyTimelineEvents } from "@/lib/properties/timeline";
import type { PropertyTimelineEvent } from "@/lib/properties/timeline";

export async function listPropertyTimelineEvents(propertyId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("property_timeline_events")
    .select("*")
    .eq("property_id", propertyId)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });

  return {
    data: data ? sortPropertyTimelineEvents(data as PropertyTimelineEvent[]) : null,
    error
  };
}
