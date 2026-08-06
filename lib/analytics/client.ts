"use client";

import { getAcquisitionContext } from "@/lib/analytics/acquisition";
import { getAnalyticsIdentity } from "@/lib/analytics/identity";
import type { AnalyticsEventRequest } from "@/lib/analytics/schemas";

const sent = new Set<string>();

function deviceClass(): AnalyticsEventRequest["device_class"] {
  const width = window.innerWidth;
  return width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}

export function getClientAnalyticsIdentity() { return getAnalyticsIdentity(); }

export async function trackEvent(eventName: AnalyticsEventRequest["event_name"], options: { propertyId?: string | null; properties?: Record<string, unknown>; dedupeKey?: string } = {}) {
  try {
    if (typeof window === "undefined" || location.pathname.startsWith("/admin") || location.pathname.startsWith("/api")) return false;
    if (options.dedupeKey && sent.has(options.dedupeKey)) return true;
    const identity = getAnalyticsIdentity();
    if (!identity) return false;
    const acquisition = getAcquisitionContext(identity.sessionId);
    const touch = acquisition?.session;
    const payload: AnalyticsEventRequest = {
      event_id: crypto.randomUUID(), event_name: eventName, event_version: 1, occurred_at: new Date().toISOString(),
      visitor_id: identity.visitorId, session_id: identity.sessionId, page_path: `${location.pathname}${location.hash}`.slice(0, 500),
      referrer: touch?.referrer || null, utm_source: touch?.source || "direct", utm_medium: touch?.medium || null,
      utm_campaign: touch?.campaign || null, utm_content: touch?.content || null, utm_term: touch?.term || null,
      device_class: deviceClass(), property_id: options.propertyId || touch?.propertyId || null, event_properties: options.properties || {}
    };
    const body = JSON.stringify(payload);
    let accepted = false;
    if (navigator.sendBeacon) accepted = navigator.sendBeacon("/api/analytics/events", new Blob([body], { type: "application/json" }));
    if (!accepted) await fetch("/api/analytics/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
    if (options.dedupeKey) sent.add(options.dedupeKey);
    return true;
  } catch { return false; }
}

export const trackPageView = (key = location.pathname) => trackEvent("page_view", { dedupeKey: `page:${key}`, properties: {} });
export const trackPropertyView = (propertyId: string, properties: Record<string, unknown>) => trackEvent("view_property", { propertyId, properties, dedupeKey: `property:${propertyId}` });
export const trackConversionClick = (kind: "click_line" | "click_phone", properties: Record<string, unknown>, propertyId?: string | null) => trackEvent(kind, { propertyId, properties });
