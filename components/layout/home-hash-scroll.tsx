"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const homeScrollTargets = new Set([
  "philosophy",
  "featured-properties",
  "services",
  "calculators",
  "process",
  "reminders",
  "team",
  "consult"
]);

function getHomeScrollTarget() {
  const searchParams = new URLSearchParams(window.location.search);
  const scrollTo = searchParams.get("scrollTo") || "";
  const hash = window.location.hash.replace("#", "");
  const target = scrollTo || hash;

  return homeScrollTargets.has(target) ? { shouldCleanUrl: Boolean(scrollTo), target } : null;
}

function cleanScrollTargetQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete("scrollTo");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function scrollToHomeTarget() {
  const scrollTarget = getHomeScrollTarget();

  if (!scrollTarget) {
    return;
  }

  const target = document.getElementById(scrollTarget.target);

  if (!target) {
    return;
  }

  const header = document.querySelector<HTMLElement>(".site-header, .site-app-header");
  const headerHeight = header?.offsetHeight ?? 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 12;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "auto"
  });

  if (scrollTarget.shouldCleanUrl) {
    cleanScrollTargetQuery();
  }
}

export function HomeHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const scrollAfterNavigation = () => {
      requestAnimationFrame(() => {
        window.setTimeout(scrollToHomeTarget, 50);
      });
    };

    scrollAfterNavigation();
    window.addEventListener("hashchange", scrollAfterNavigation);

    return () => {
      window.removeEventListener("hashchange", scrollAfterNavigation);
    };
  }, [pathname]);

  return null;
}
