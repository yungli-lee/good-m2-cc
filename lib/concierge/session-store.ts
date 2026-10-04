import { createSupabaseAdminClient } from "../supabase/server.ts";
import { conciergeStateSchema, emptyConciergeState, type ConciergeState } from "./state.ts";
import type { Needs } from "./schema.ts";

export async function loadConciergeSession(sessionId: string, fallbackNeeds?: Needs) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("concierge_sessions")
    .select("state,turn_count,last_intent,expires_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.warn("concierge_session_load_failed", { code: error.code });
    return emptyConciergeState(fallbackNeeds);
  }
  if (!data || new Date(data.expires_at).getTime() <= Date.now()) return emptyConciergeState(fallbackNeeds);

  const parsed = conciergeStateSchema.safeParse({
    ...(data.state || {}),
    turnCount: data.turn_count ?? (data.state as Record<string, unknown> | null)?.turnCount ?? 0,
    lastIntent: data.last_intent ?? (data.state as Record<string, unknown> | null)?.lastIntent ?? "general"
  });
  return parsed.success ? parsed.data : emptyConciergeState(fallbackNeeds);
}

export async function saveConciergeSession(sessionId: string, state: ConciergeState) {
  const supabase = createSupabaseAdminClient();
  const payload = conciergeStateSchema.parse(state);
  const { error } = await supabase.from("concierge_sessions").upsert({
    session_id: sessionId,
    state: payload,
    turn_count: payload.turnCount,
    last_intent: payload.lastIntent,
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }, { onConflict: "session_id" });
  if (error) console.warn("concierge_session_save_failed", { code: error.code });
}
