import type { Metadata } from "next";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { getPublishedSitePageByType } from "@/lib/home-cms/queries";
import { markdownToHtml } from "@/lib/home-cms/render";
import { siteOrigin } from "@/lib/home-cms/routing";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { data: page } = await getPublishedSitePageByType("contact");
  const title = page?.seo_title?.trim() || "聯絡我們｜阿勇不動產顧問";
  const description = page?.seo_description?.trim() || page?.subtitle?.trim() || "聯絡阿勇不動產顧問，討論買屋、賣屋與不動產服務需求。";
  const image = page?.media_public_url || page?.fallback_cover_url || null;
  return {
    title,
    description,
    alternates: { canonical: `${siteOrigin()}/contact` },
    openGraph: {
      title,
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
  const links = [
    ["LINE", company.line_url],
    ["Facebook", company.facebook_url],
    ["Instagram", company.instagram_url],
    ["YouTube", company.youtube_url],
    ["TikTok", company.tiktok_url],
    ["Google Maps", company.google_maps_url]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <main>
      <section className="hero-lite">
        <div className="container">
          <p className="eyebrow">{page?.eyebrow || "Contact"}</p>
          <h1>{page?.title || "聯絡我們"}</h1>
          <p>{page?.subtitle || "把需求告訴我們，一起整理條件與下一步。"}</p>
        </div>
      </section>
      <section className="section">
        <div className="container contact-page-grid">
          <article className="card">
            <div className="card-body">
              {page?.markdown_content ? (
                <div
                  className="cms-markdown-body"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(page.markdown_content) }}
                />
              ) : (
                <p>歡迎透過電話、Email 或 LINE 聯絡，我們會協助您整理買屋、賣屋與不動產服務需求。</p>
              )}
              {company.company_phone ? <p><a href={`tel:${company.company_phone.replace(/[^\d+]/g, "")}`}>{company.company_phone}</a></p> : null}
              {company.company_email ? <p><a href={`mailto:${company.company_email}`}>{company.company_email}</a></p> : null}
              {company.company_address ? <p>{company.company_address}</p> : null}
              <div className="actions">
                {links.map(([label, href]) => <a className="button ghost" href={href} key={label}>{label}</a>)}
              </div>
            </div>
          </article>
          <aside className="card">
            <div className="card-body">
              {company.logo_url ? <img className="company-info-logo" src={company.logo_url} alt={`${company.company_name}標誌`} /> : null}
              <h2>{company.company_name}</h2>
              <p>{company.franchise_name}</p>
              <p>{company.brokerage_license_no}</p>
              <p>{company.realtor_certificate_no}</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
