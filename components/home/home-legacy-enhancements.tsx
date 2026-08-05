"use client";

import { useEffect } from "react";

/**
 * Temporary compatibility boundary for calculators, property discovery and the
 * service form. Homepage structure and CMS rendering no longer depend on it.
 */
export function HomeLegacyEnhancements() {
  useEffect(() => {
    document.querySelector('script[data-home-legacy-enhancements="true"]')?.remove();
    const script = document.createElement("script");
    script.src = "/legacy-static/script.js";
    script.async = true;
    script.dataset.homeLegacyEnhancements = "true";
    document.body.appendChild(script);
    return () => script.remove();
  }, []);
  return null;
}
