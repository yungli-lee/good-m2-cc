import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { getPublishedSitePageByType } from "@/lib/home-cms/queries";
import { MarkdownContent } from "@/components/home/markdown-content";
import { siteOrigin } from "@/lib/home-cms/routing";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [{ data: page }, company] = await Promise.all([
    getPublishedSitePageByType("contact"),
    getPublicCompanySettings()
  ]);
  const title = page?.seo_title?.trim() || `聯絡我們｜${company.brand_name}`;
  const description = page?.seo_description?.trim() || page?.subtitle?.trim() || `聯絡${company.brand_name}，討論買屋、賣屋與不動產服務需求。`;
  const image = page?.media_public_url || page?.fallback_cover_url || null;
  return {
    title,
    description,
    alternates: { canonical: `${siteOrigin()}/contact` },
    openGraph: {
      title,
      siteName: company.brand_name,
      description,
      url: `${siteOrigin()}/contact`,
      images: image ? [image] : undefined
    }
  };
}

export default async function ContactPage() {
  const [company, pageResult] = await Promise.all([
    getPublicCompanySettings(),
    getPublishedSitePageByType("contact")
  ]);
  const page = pageResult.data;
  if (!page) notFound();
  const links = [
    ["LINE", company.line_url],
    ["Facebook", company.facebook_url],
    ["Instagram", company.instagram_url],
    ["YouTube", company.youtube_url],
    ["TikTok", company.tiktok_url],
    ["Google Maps", company.google_maps_url]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const serviceOptions = [
    { title: "我要買屋／找土地", description: "告訴我們想找的地區、預算、坪數及使用需求，不必只看網站現有物件。", prompt: "我想買屋／找土地，想先和阿勇、阿美討論需求。" },
    { title: "我要賣屋／賣土地", description: "先聊物件位置、現況、行情與委託出售的規劃。", prompt: "我有不動產想出售，想先了解行情及委託方式。" },
    { title: "我有不動產問題", description: "產權、貸款、稅務、土地使用、簽約與交屋，都可以先提出問題。", prompt: "我有不動產相關問題，想請阿勇、阿美協助釐清。" }
  ];
  return (
    <main>
      <section className="hero-lite">
        <div className="container">
          <p className="eyebrow">{page.eyebrow || "Contact"}</p>
          <h1>{page.title}</h1>
          <p>{page.subtitle || "把需求告訴我們，一起整理條件與下一步。"}</p>
        </div>
      </section>
      <section className="section contact-service-section">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">從需求開始，而不是從物件開始</p>
            <h2>今天想找我們聊什麼？</h2>
            <p>不必先準備完整資料，選一個方向，我們陪您一起整理。</p>
          </div>
          <div className="contact-service-options">
            {serviceOptions.map((option) => (
              <article className="card" key={option.title}>
                <div className="card-body">
                  <h3>{option.title}</h3>
                  <p>{option.description}</p>
                  <p className="contact-prompt">可以先這樣告訴我們：「{option.prompt}」</p>
                  <div className="actions">
                    {company.line_url ? <a className="button primary" href={company.line_url} target="_blank" rel="noopener noreferrer">LINE 詢問</a> : null}
                    {company.company_phone ? <a className="button ghost" href={`tel:${company.company_phone.replace(/[^\\d+]/g, "")}`}>電話聯絡</a> : null}
                    {!company.line_url && !company.company_phone && company.company_email ? <a className="button primary" href={`mailto:${company.company_email}`}>Email 詢問</a> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="contact-details-grid">
            <article className="card">
              <div className="card-body">
                <h2>認識阿勇與阿美，直接聯絡我們</h2>
                <p>我不是帶你看房，我是陪你做決定。</p>
                {page.markdown_content ? <MarkdownContent value={page.markdown_content} /> : <p>買屋、賣屋、貸款、稅務、簽約到交屋，每一步都清楚說明。</p>}
                {company.company_phone ? <p>電話：<a href={`tel:${company.company_phone.replace(/[^\\d+]/g, "")}`}>{company.company_phone}</a></p> : null}
                {company.company_email ? <p>Email：<a href={`mailto:${company.company_email}`}>{company.company_email}</a></p> : null}
                {company.company_address ? <p>服務據點：{company.company_address}</p> : null}
                <div className="actions">{links.map(([label, href]) => <a className="button ghost" href={href} key={label} target="_blank" rel="noopener noreferrer">{label}</a>)}</div>
              </div>
            </article>
            <aside className="card">
              <div className="card-body">
                {company.franchise_logo_url ? <img className="company-info-logo" src={company.franchise_logo_url} alt={`${company.franchise_name}標誌`} /> : null}
                <h2>{company.company_name}</h2>
                <p>{company.franchise_name}</p>
                <p>經紀業許可文號：{company.brokerage_license_no}</p>
                <p>不動產經紀人證號：{company.realtor_certificate_no}</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
