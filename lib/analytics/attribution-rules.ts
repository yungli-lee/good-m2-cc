export type AttributionTouch = {
  id: string;
  event_id: string;
  session_id: string | null;
  property_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  occurred_at: string;
};

export function touchSource(event: AttributionTouch) { return (event.utm_source || "direct").toLowerCase(); }
export function isNonDirectTouch(event: AttributionTouch) { return touchSource(event) !== "direct"; }

export function selectAttributionTouches(visitorEvents: AttributionTouch[], sessionEvents: AttributionTouch[]) {
  return {
    first: visitorEvents.find(isNonDirectTouch) || visitorEvents[0] || null,
    lead: sessionEvents[0] || null,
    lastNonDirect: [...visitorEvents].reverse().find(isNonDirectTouch) || null
  };
}
