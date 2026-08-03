import type { ComponentType } from "react";
import type { SitePage, SitePageKey } from "@/lib/home-cms/types";

export type HomeSectionType =
  | "hero"
  | "featured-properties"
  | "property-search"
  | "latest-properties"
  | "knowledge-preview"
  | "philosophy"
  | "buying-advice"
  | "common-problems"
  | "services"
  | "calculator-tools"
  | "commitment"
  | "process"
  | "tax"
  | "loan"
  | "mortgage-calculator"
  | "reminders"
  | "team"
  | "contact"
  | "service-form";

export type HomeSectionDefinition<Props = Record<string, never>> = {
  type: HomeSectionType;
  sortOrder: number;
  component: ComponentType<Props>;
  props: Props;
};

export type ManagedHomeSection = {
  key: SitePageKey;
  page: SitePage & { media_public_url?: string | null };
  sortOrder: number;
};

const managedPageTypeToSection = {
  philosophy: "philosophy",
  services: "services",
  contact: "team"
} as const;

export function resolveManagedHomeSection(page: ManagedHomeSection["page"]): ManagedHomeSection | null {
  if (page.status !== "published" || page.archived_at) return null;
  const key = page.page_type === "reminder"
    ? "reminders"
    : managedPageTypeToSection[page.page_type as keyof typeof managedPageTypeToSection] || page.page_key;
  if (!["philosophy", "services", "process", "reminders", "team"].includes(key)) {
    console.warn("home_section_registry_unknown_type", { pageKey: page.page_key, pageType: page.page_type });
    return null;
  }
  return { key, page, sortOrder: page.sort_order };
}

export function sortHomeSections<T extends { sortOrder: number; stableKey: string }>(sections: T[]) {
  return [...sections].sort((left, right) => left.sortOrder - right.sortOrder || left.stableKey.localeCompare(right.stableKey));
}
