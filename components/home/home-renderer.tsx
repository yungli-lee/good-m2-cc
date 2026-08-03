import { createElement, Fragment } from "react";
import { HomeCampaignCarousel } from "@/components/home/home-campaign-carousel";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeHeader } from "@/components/home/home-header";
import { HomeLegacyEnhancements } from "@/components/home/home-legacy-enhancements";
import { legacyHomeSections } from "@/components/home/legacy-section-content";
import { ManagedReminders, ManagedSection } from "@/components/home/managed-section";
import type { CompanySettings } from "@/lib/company-settings";
import { resolveManagedHomeSection, sortHomeSections } from "@/lib/home-cms/registry";
import type { HomeCampaign, SitePage } from "@/lib/home-cms/types";
import type { ResolvedNavigationItem } from "@/lib/navigation";

type Campaign = HomeCampaign & { media_public_url?: string | null };
type Page = SitePage & { media_public_url?: string | null };

const managedKeys = new Set(["philosophy", "services", "process", "reminders", "team"]);

function StaticSection({ section, company }: { section: (typeof legacyHomeSections)[number]; company: CompanySettings }) {
  const dataProps = Object.fromEntries(section.data.map(([name, value]) => [name, value || true]));
  const literalReplacements = [
    ["{{BRAND_NAME}}", company.brand_name],
    ["https://line.me/ti/p/abQv5LYzzE", company.line_url],
    ["tel:0938137177", company.company_phone ? `tel:${company.company_phone.replace(/[^\d+]/g, "")}` : "#consult"],
    ["mailto:best@m2.cc", company.company_email ? `mailto:${company.company_email}` : "#consult"],
    ["https://m.facebook.com/p0938137177/", company.facebook_url],
    ["https://youtube.com/channel/UCkHgKlrQTko0FPyAtYC9KBA?si=Dyyb72tdYhEM1IIx", company.youtube_url],
    ["https://www.tiktok.com/@buyhouse4", company.tiktok_url]
  ] as const;
  let html: string = section.html;
  for (const [fallback, configured] of literalReplacements) {
    if (configured) html = html.split(fallback).join(configured);
  }
  return createElement("section", {
    className: section.className,
    id: section.id || undefined,
    hidden: section.hidden || undefined,
    ...dataProps,
    dangerouslySetInnerHTML: { __html: html }
  });
}

export function HomeRenderer({ campaigns, pages, company, navigation }: { campaigns: Campaign[]; pages: Page[]; company: CompanySettings; navigation: ResolvedNavigationItem[] }) {
  const resolved = pages.map(resolveManagedHomeSection).filter((section): section is NonNullable<typeof section> => Boolean(section));
  const managedByKey = new Map<string, Page[]>();
  for (const section of resolved) managedByKey.set(section.key, [...(managedByKey.get(section.key) || []), section.page]);

  const sections = legacyHomeSections.map((section, index) => {
    const managed = managedByKey.get(section.key);
    const sortOrder = managed?.[0]?.sort_order ?? index * 100;
    return {
      stableKey: section.key,
      sortOrder,
      node: section.key === "hero" && campaigns.length
        ? <HomeCampaignCarousel campaigns={campaigns} />
        : section.key === "reminders" && managed?.length
          ? <ManagedReminders pages={managed} />
          : managed?.[0] && managedKeys.has(section.key)
            ? <ManagedSection page={managed[0]} sectionId={section.id || section.key} />
            : <StaticSection section={section} company={company} />
    };
  });

  return (
    <>
      <HomeHeader company={company} navigation={navigation} />
      <main>{sortHomeSections(sections).map((section) => <Fragment key={section.stableKey}>{section.node}</Fragment>)}</main>
      <HomeFooter company={company} navigation={navigation} />
      <HomeLegacyEnhancements />
    </>
  );
}
