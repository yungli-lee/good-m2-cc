import type { Metadata } from "next";
import { Concierge } from "@/components/concierge/concierge";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { conciergeEnv } from "@/lib/concierge/model";
import { getRequestContext } from "@/lib/supabase/env";
export const runtime = "edge";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "阿勇阿美陪你找物件｜勇美", description: "描述找房、找土地或委託需求，讓阿勇阿美導覽助理幫你整理條件與查詢在售物件。", alternates: { canonical: "/guide" } };
export default async function GuidePage() {
  const company = await getPublicCompanySettings();
  const env = getRequestContext()?.env as Record<string, string | undefined> | undefined;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  return <main><section className="section"><div className="container"><Concierge aiEnabled={Boolean(conciergeEnv().key)} siteKey={siteKey} phone={company.company_phone} lineUrl={company.line_url} /></div></section></main>;
}
