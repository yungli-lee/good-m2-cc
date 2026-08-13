import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyCard } from "@/components/properties/property-card";
import { getPublicAreaPage } from "@/lib/areas-cms";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { listPublishedPropertiesByArea } from "@/lib/properties/queries";
import type { Property } from "@/lib/properties/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const area = await getPublicAreaPage(slug);
  if (!area) return {};
  const company = await getPublicCompanySettings();
  const title = area.seo_title || `${area.headline}｜${company.brand_name}`;
  const description = area.seo_description || area.summary;
  const url = `/areas/${area.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, siteName: company.brand_name, url } };
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = await getPublicAreaPage(slug);
  if (!area) notFound();
  const [company, propertyResult] = await Promise.all([getPublicCompanySettings(), listPublishedPropertiesByArea(area.city, area.district)]);
  const properties = (propertyResult.data || []) as Property[];
  const phoneHref = company.company_phone ? `tel:${company.company_phone.replace(/[^\d+]/g, "")}` : null;
  const areaUrl = `https://good.m2.cc/areas/${area.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首頁", item: "https://good.m2.cc/" },
      { "@type": "ListItem", position: 2, name: "服務地區", item: "https://good.m2.cc/areas" },
      { "@type": "ListItem", position: 3, name: area.name, item: areaUrl }
    ]
  };

  return <main className="area-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <section className="area-hero"><div className="container area-hero-grid"><div>
      <p className="area-eyebrow">{area.eyebrow}</p><h1>{area.headline}</h1><p className="area-hero-summary">{area.summary}</p>
      <div className="area-actions"><a className="button" href="#properties">找{area.shortName}物件</a><Link className="button ghost" href="/contact">委託阿勇出售</Link></div>
    </div><aside className="area-hero-note" aria-label={`${area.name}服務重點`}><span>阿勇服務地區</span><strong>{area.name}</strong><p>{area.propertyKeywords.join("・")}</p></aside></div></section>

    <section className="section area-intro"><div className="container">
      <nav className="breadcrumb" aria-label="麵包屑"><Link href="/">首頁</Link><span aria-hidden="true">/</span><Link href="/areas">服務地區</Link><span aria-hidden="true">/</span><span>{area.name}</span></nav>
      <div className="area-intro-grid"><div><p className="area-eyebrow">Local Insight</p><h2>先了解{area.name}，再決定怎麼找</h2><p>{area.description}</p></div><div className="area-audience"><h3>適合從這頁開始的人</h3><ul>{area.audiences.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
    </div></section>

    <section className="section area-feature-section"><div className="container"><div className="area-section-heading"><p className="area-eyebrow">Why Here</p><h2>{area.name}的三個觀察重點</h2></div><div className="area-feature-grid">{area.features.map((feature, index) => <article key={feature.title}><span>0{index + 1}</span><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div></div></section>

    <section className="section" id="properties"><div className="container"><div className="area-section-heading area-listing-heading"><div><p className="area-eyebrow">For Sale</p><h2>目前{area.name}公開物件</h2></div><Link href="/properties">查看全部物件</Link></div>
      {propertyResult.error ? <div className="notice">目前物件資料讀取失敗，請稍後再試。</div> : null}
      {!propertyResult.error && properties.length === 0 ? <div className="area-empty"><h3>目前沒有符合條件的公開物件</h3><p>物件會隨委託狀態更新。您可以先把需求告訴阿勇，有合適的{area.shortName}物件時協助留意。</p>{company.line_url ? <a className="button" href={company.line_url}>LINE 告訴阿勇需求</a> : <Link className="button" href="/contact">留下找房需求</Link>}</div> : null}
      {properties.length ? <div className="grid">{properties.map((property) => <PropertyCard key={property.id} property={property} />)}</div> : null}
    </div></section>

    <section className="section area-caution-section"><div className="container area-caution-grid"><div><p className="area-eyebrow">Before You Decide</p><h2>看屋、看地前先確認</h2><p>同一個地區，不同產品的判斷方式仍然不同。現場條件與文件資料要一起核對。</p></div><ol>{area.cautions.map((item) => <li key={item}>{item}</li>)}</ol></div></section>

    <section className="section"><div className="container"><div className="area-section-heading"><p className="area-eyebrow">FAQ</p><h2>{area.name}常見問題</h2></div><div className="area-faq-list">{area.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></div></section>

    <section className="section area-final-cta"><div className="container area-final-cta-card"><div><p className="area-eyebrow">Talk to A-Yong</p><h2>想買，或想賣，都可以先聊聊</h2><p>告訴阿勇您的{area.name}需求，我會協助整理條件、資訊與下一步。</p></div><div className="area-actions">{company.line_url ? <a className="button" href={company.line_url}>LINE 阿勇諮詢</a> : null}{phoneHref ? <a className="button ghost" href={phoneHref}>撥打電話</a> : null}<Link className="button ghost" href="/contact">填寫需求</Link></div></div></section>
  </main>;
}
