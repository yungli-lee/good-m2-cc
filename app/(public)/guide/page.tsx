import type { Metadata } from "next";
import Link from "next/link";
import { PropertyCard } from "@/components/properties/property-card";
import { KnowledgeCard } from "@/components/content/knowledge-card";
import { ReminderCard } from "@/components/content/reminder-card";
import { listFeaturedProperties } from "@/lib/properties/queries";
import { listKnowledgeRecommendations } from "@/lib/content/queries";
import { listPublishedReminderPages } from "@/lib/home-cms/queries";
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
  const [company, featuredResult, knowledge, reminders] = await Promise.all([
    getPublicCompanySettings(),
    listFeaturedProperties(3),
    listKnowledgeRecommendations(3),
    listPublishedReminderPages(2)
  ]);
  const featured = featuredResult.error ? [] : (featuredResult.data || []);
  const env = getRequestContext()?.env as Record<string, string | undefined> | undefined;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  return <main className="guide-landing">
    <section id="guide-start" className="section guide-landing-intro"><div className="container">
      <Concierge aiEnabled={Boolean(conciergeEnv().key)} siteKey={siteKey} phone={company.company_phone} lineUrl={company.line_url} />
    </div></section>
    <section className="section guide-landing-section" aria-labelledby="guide-featured-title"><div className="container">
      <div className="guide-landing-section-heading"><div><p className="eyebrow">先看看有沒有喜歡的</p><h2 id="guide-featured-title">目前精選物件</h2><p className="muted">以下為網站公開在售精選，想了解任何一件，都能請阿勇阿美協助。</p></div><Link href="/properties" className="button ghost">看全部物件</Link></div>
      {featured.length ? <div className="grid guide-landing-card-grid">{featured.map(item => <PropertyCard key={item.id} property={item} />)}</div> : <div className="guide-landing-empty"><p>精選物件整理中，歡迎先告訴我們地區、預算與需求。</p><Link href="/properties" className="button ghost">瀏覽公開物件</Link></div>}
    </div></section>
    <section className="section guide-landing-section guide-landing-services" aria-labelledby="guide-services-title"><div className="container">
      <div className="guide-landing-section-heading"><div><p className="eyebrow">有人陪你整理，不必從零開始</p><h2 id="guide-services-title">AI 小助手可以幫你什麼？</h2></div></div>
      <div className="guide-landing-benefits">
        <div><strong>01｜整理找房需求</strong><p>從地區、預算、房型與必要條件開始，釐清你的優先順序。</p></div>
        <div><strong>02｜了解公開物件</strong><p>介紹網站已上架的在售物件資訊，協助找到值得進一步詢問的選項。</p></div>
        <div><strong>03｜認識交易重點</strong><p>從知識庫了解買屋流程、貸款、稅費及看屋常見問題。</p></div>
        <div><strong>04｜交由真人接續</strong><p>需要安排帶看或進一步諮詢，可由阿勇、阿美協助聯繫。</p></div>
      </div>
      <p className="guide-landing-disclaimer">AI 回答提供初步參考；物件現況、交易條件與帶看時間，以現場及真人確認為準。</p>
    </div></section>
    {knowledge.length > 0 ? <section className="section guide-landing-section" aria-labelledby="guide-knowledge-title"><div className="container">
      <div className="guide-landing-section-heading"><div><p className="eyebrow">決定買房前，先多懂一點</p><h2 id="guide-knowledge-title">不動產知識精選</h2></div><Link href="/knowledge" className="button ghost">前往知識庫</Link></div>
      <div className="grid guide-landing-card-grid">{knowledge.map(item => <KnowledgeCard key={item.id} item={item} />)}</div>
    </div></section> : null}
    {reminders.length > 0 ? <section className="section guide-landing-section guide-landing-reminders" aria-labelledby="guide-reminders-title"><div className="container">
      <div className="guide-landing-section-heading"><div><p className="eyebrow">關心房子，也關心生活</p><h2 id="guide-reminders-title">阿勇生活小提醒</h2></div><Link href="/#reminders" className="button ghost">看更多提醒</Link></div>
      <div className="grid guide-landing-card-grid">{reminders.map(item => <ReminderCard key={item.id} page={item} />)}</div>
    </div></section> : null}
    <section className="section guide-landing-final"><div className="container"><div className="guide-landing-final-panel">
      <h2>還沒找到合適的？把需求告訴我們</h2><p>先由 AI 整理需求，或直接聯絡阿勇阿美，安排下一步。</p>
      <div className="actions"><Link href="/guide#guide-start" className="button primary">開始整理需求</Link>{company.line_url ? <a className="button ghost" href={company.line_url} target="_blank" rel="noopener noreferrer">LINE 詢問</a> : null}</div>
    </div></div></section>
  </main>;
}
