"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getClientAnalyticsIdentity, trackConversionClick, trackEvent, trackPageView } from "@/lib/analytics/client";

declare global {
  interface Window {
    goodM2Analytics?: {
      getIdentity: typeof getClientAnalyticsIdentity;
      trackEvent: typeof trackEvent;
    };
  }
}

function locationName(element: Element) {
  if (element.closest("header")) return "header";
  if (element.closest("footer")) return "footer";
  if (element.classList.contains("floating-line")) return "floating";
  if (element.closest("[data-property-id]")) return "property";
  if (element.closest("article")) return "knowledge";
  return "page";
}

export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    window.goodM2Analytics = { getIdentity: getClientAnalyticsIdentity, trackEvent };
    return () => { delete window.goodM2Analytics; };
  }, []);

  useEffect(() => {
    const isErrorPage = Boolean(document.querySelector("meta[name='next-error']") || document.querySelector("[data-next-error-h1]"));
    if (!pathname.startsWith("/admin") && !isErrorPage) void trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      const properties = { contact_person: null, cta_location: locationName(anchor) };
      if (/line\.me|lin.ee/.test(href)) void trackConversionClick("click_line", properties, anchor.closest<HTMLElement>("[data-property-id]")?.dataset.propertyId);
      if (href.startsWith("tel:")) void trackConversionClick("click_phone", properties, anchor.closest<HTMLElement>("[data-property-id]")?.dataset.propertyId);
      if (/google\.[^/]+\/maps|maps\.app\.goo\.gl/.test(href)) void trackEvent("open_map", { propertyId: anchor.closest<HTMLElement>("[data-property-id]")?.dataset.propertyId, properties: { map_provider: "google", cta_location: locationName(anchor) } });
      const propertyId = anchor.closest<HTMLElement>("[data-property-id]")?.dataset.propertyId;
      if (propertyId && /lineit\/share|facebook\.com\/sharer/.test(href)) void trackEvent("share_property", { propertyId, properties: { share_channel: href.includes("lineit") ? "line" : "facebook", cta_location: locationName(anchor) } });
    };
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || !location.pathname.startsWith("/calculator")) return;
      void trackEvent("use_calculator", { properties: { calculator_type: location.pathname.split("/").filter(Boolean).pop() || "calculator", completed: true } });
    };
    const onFocus = (event: FocusEvent) => {
      const form = (event.target as Element | null)?.closest<HTMLFormElement>("form");
      if (!form || form.dataset.analyticsStarted === "true") return;
      if (form.id !== "consult-form" && !form.dataset.inquiryForm) return;
      form.dataset.analyticsStarted = "true";
      void trackEvent("start_inquiry", { dedupeKey: `start-inquiry:${form.id || "form"}:${getClientAnalyticsIdentity()?.sessionId}`, properties: { form_type: form.dataset.formType || "service-form", form_location: form.dataset.formLocation || "page" } });
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return null;
}
