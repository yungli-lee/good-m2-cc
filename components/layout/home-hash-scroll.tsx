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

const maxScrollAttempts = 10;
const scrollAttemptDelayMs = 50;
const scrollTolerancePx = 8;

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

function getHeaderOffset() {
  const header = document.querySelector<HTMLElement>(".site-header, .site-app-header");
  const headerHeight = header?.offsetHeight ?? 0;

  return headerHeight + 12;
}

function getTargetTop(target: HTMLElement) {
  const headerOffset = getHeaderOffset();

  return Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset);
}

function isTargetInPosition(target: HTMLElement) {
  const headerOffset = getHeaderOffset();
  const currentTop = target.getBoundingClientRect().top;

  return Math.abs(currentTop - headerOffset) <= scrollTolerancePx;
}

function scrollToHomeTarget(attempt = 1) {
  const scrollTarget = getHomeScrollTarget();

  if (!scrollTarget) {
    return;
  }

  const target = document.getElementById(scrollTarget.target);

  if (!target) {
    if (attempt < maxScrollAttempts) {
      window.setTimeout(() => scrollToHomeTarget(attempt + 1), scrollAttemptDelayMs);
    }
    return;
  }

  window.scrollTo({
    top: getTargetTop(target),
    behavior: "auto"
  });

  requestAnimationFrame(() => {
    if (isTargetInPosition(target)) {
      if (scrollTarget.shouldCleanUrl) {
        cleanScrollTargetQuery();
      }
      return;
    }

    if (attempt < maxScrollAttempts) {
      window.setTimeout(() => scrollToHomeTarget(attempt + 1), scrollAttemptDelayMs);
    }
  });
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
