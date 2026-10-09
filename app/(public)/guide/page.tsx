import type { Metadata } from "next";
import { Concierge } from "@/components/concierge/concierge";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { conciergeEnv } from "@/lib/concierge/model";
import { getRequestContext } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/home-cms/routing";
export const runtime = "edge";
export const dynamic = "force-dynamic";
const guideTitle = "阿勇阿美 AI 找房小助手｜勇美不動產顧問";
const guideDescription = "想找房、土地或委託出售？阿勇、阿美陪你整理地區、預算與需求，輕鬆找到適合的物件。";
export async function generateMetadata(): Promise<Metadata> {
  const db = await createSupabaseServerClient();
  const { data } = await db.from("ai_assistant_images").select("image_url").eq("role", "duo").maybeSingle();
  const rawUrl: unknown = data?.image_url;
  // The public media URL is supplied by the authenticated admin image-upload workflow.
  const duoUrl = typeof rawUrl === "string" && /^https:\/\//.test(rawUrl)
    ? rawUrl
    : new URL("/images/guides/ayong-amei.webp", siteOrigin()).toString();
  const guideUrl = new URL("/guide", siteOrigin()).toString();
  return {
    title: guideTitle,
    description: guideDescription,
    alternates: { canonical: guideUrl },
    openGraph: {
      type: "website",
      locale: "zh_TW",
      url: guideUrl,
      title: guideTitle,
      description: guideDescription,
      images: [{ url: duoUrl, alt: "AI 阿勇與阿美雙人找房小助手" }]
    },
    twitter: {
      card: "summary_large_image",
      title: guideTitle,
      description: guideDescription,
      images: [duoUrl]
    }
  };
}
export default async function GuidePage() {
  const company = await getPublicCompanySettings();
  const env = getRequestContext()?.env as Record<string, string | undefined> | undefined;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  return <main><section className="section"><div className="container"><Concierge aiEnabled={Boolean(conciergeEnv().key)} siteKey={siteKey} phone={company.company_phone} lineUrl={company.line_url} /></div></section></main>;
}
