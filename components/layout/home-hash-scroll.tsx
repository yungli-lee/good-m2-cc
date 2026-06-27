"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const homeHashes = new Set([
  "philosophy",
  "featured-properties",
  "services",
  "calculators",
  "process",
  "reminders",
  "team",
  "consult"
]);

function scrollToHomeHash() {
  const hash = window.location.hash.replace("#", "");

  if (!homeHashes.has(hash)) {
    return;
  }

  const target = document.getElementById(hash);

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
}

export function HomeHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const scrollAfterNavigation = () => {
      requestAnimationFrame(() => {
        window.setTimeout(scrollToHomeHash, 50);
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
