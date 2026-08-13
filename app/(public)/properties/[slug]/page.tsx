import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { formatPublicPing, formatPrice, isLandProperty, propertyTypeLabel } from "@/lib/format";
import { getPublishedPropertyBySlug, getPublicPropertyAvailability } from "@/lib/properties/queries";
import { resolvePropertySeo } from "@/lib/properties/seo";
import type { Property } from "@/lib/properties/types";
import { PropertyMediaGallery } from "@/components/media/property-media-gallery";
import { PropertyViewTracker } from "@/components/analytics/content-trackers";

export const runtime = "edge";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [{ data }, company, availabilityResult] = await Promise.all([
    getPublishedPropertyBySlug(slug),
    getPublicCompanySettings(),
    getPublicPropertyAvailability(slug)
  ]);
  const property = data as Property | null;
  if (!property && availabilityResult.data) return {
    title: `此物件已下架｜${company.brand_name}`,
    description: "此物件資訊已停止公開，歡迎查看其他物件或聯絡阿勇。",
    robots: { index: false, follow: true },
    openGraph: { title: `此物件已下架｜${company.brand_name}`, description: "此物件資訊已停止公開，歡迎查看其他物件或聯絡阿勇。", siteName: company.brand_name }
  };
  if (!property) return { title: `物件不存在｜${company.brand_name}` };
  const seo = resolvePropertySeo(property);
  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.ogTitle,
      siteName: company.brand_name,
      description: seo.ogDescription,
      images: seo.ogImage ? [seo.ogImage] : undefined
    },
    alternates: { canonical: seo.canonical }
  };
}

export default async function PropertyDetailPage({ params }: Props) {
  const { slug } = await params;
  const [{ data, error }, availabilityResult, companySettings] = await Promise.all([
    getPublishedPropertyBySlug(slug), getPublicPropertyAvailability(slug), getPublicCompanySettings()
  ]);
  if ((error || !data) && availabilityResult.data) {
    const unavailable = availabilityResult.data as { unavailable_reason?: string | null; status?: string };
    return <main className="property-unavailable-page"><section className="section"><div className="container property-unavailable-card">
      <p className="eyebrow">Property Update</p><h1>此物件已下架</h1>
      <p className="property-unavailable-reason">下架原因：{unavailable.unavailable_reason || (unavailable.status === "expired" ? "委託到期" : "已停止公開")}</p>
      <p>物件資訊已停止公開。歡迎查看其他公開物件，或把您的找房需求告訴阿勇。</p>
      <div className="actions"><Link className="button" href="/properties">查看其他物件</Link><Link className="button ghost" href="/areas">依地區找房</Link>{companySettings.line_url ? <a className="button ghost" href={companySettings.line_url}>LINE 阿勇諮詢</a> : null}</div>
    </div></section></main>;
  }
  if (error || !data) notFound();

  const property = data as Property;
  const companyLinks = [
    ["Google Maps", companySettings.google_maps_url],
    ["Facebook", companySettings.facebook_url],
    ["Instagram", companySettings.instagram_url],
    ["YouTube", companySettings.youtube_url],
    ["TikTok", companySettings.tiktok_url],
    ["LINE", companySettings.line_url]
  ].filter(([, href]) => href);
  const media = property.property_media?.filter((item) => !item.deleted_at) || [];

  return (
    <main data-property-id={property.id}>
      <PropertyViewTracker propertyId={property.id} properties={{
        property_title: property.title,
        property_category: property.property_type || null,
        city: null,
        district: null,
        price: property.price == null ? null : Number(property.price),
        listing_status: property.status || null
      }} />
      <section className="section">
        <div className="container detail-layout">
          <PropertyMediaGallery media={media} title={property.title} propertyId={property.id} />
          <aside className="card">
            <div className="card-body">
              <h1 style={{ marginTop: 0 }}>{property.title}</h1>
              <div className="price">{formatPrice(property.price)}</div>
              <p>{property.address_public || "地址洽詢"}</p>
              <p>類型：{propertyTypeLabel(property.property_type)}</p>
              {formatPublicPing(property.land_area_ping) ? <p>土地：{formatPublicPing(property.land_area_ping)}</p> : null}
              {formatPublicPing(property.building_area_ping) ? <p>建物：{formatPublicPing(property.building_area_ping)}</p> : null}
              {!isLandProperty(property.property_type) && property.layout ? <p>格局：{property.layout}</p> : null}
              <p>屋齡：{property.age == null ? "-" : `${property.age} 年`}</p>
              <p>座向：{property.orientation || "-"}</p>
              <div className="actions">
                <a className="button" href="https://line.me/ti/p/abQv5LYzzE" target="_blank" rel="noreferrer">
                  Line 阿勇諮詢
                </a>
                <Link className="button secondary" href="/#service-form">
                  填寫服務表單
                </Link>
              </div>
              <section className="company-info-panel" aria-label="公司資訊">
                {companySettings.franchise_logo_url ? <img className="company-info-logo" src={companySettings.franchise_logo_url} alt={companySettings.franchise_name} loading="lazy" /> : null}
                <h2>{companySettings.company_name}</h2>
                <p>{companySettings.franchise_name}</p>
                <dl>
                  <div>
                    <dt>經紀業特許字號</dt>
                    <dd>{companySettings.brokerage_license_no}</dd>
                  </div>
                  <div>
                    <dt>不動產經紀人證號</dt>
                    <dd>{companySettings.realtor_certificate_no}</dd>
                  </div>
                  {companySettings.salesperson_registration_no ? (
                    <div>
                      <dt>營業員登記證號</dt>
                      <dd>{companySettings.salesperson_registration_no}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>電話</dt>
                    <dd>{companySettings.company_phone ? <a href={`tel:${companySettings.company_phone}`}>{companySettings.company_phone}</a> : "-"}</dd>
                  </div>
                  <div>
                    <dt>地址</dt>
                    <dd>{companySettings.company_address || "-"}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{companySettings.company_email ? <a href={`mailto:${companySettings.company_email}`}>{companySettings.company_email}</a> : "-"}</dd>
                  </div>
                </dl>
                {companyLinks.length ? (
                  <div className="company-info-links">
                    {companyLinks.map(([label, href]) => (
                      <a key={label} className="button ghost" href={href} target="_blank" rel="noreferrer">{label}</a>
                    ))}
                  </div>
                ) : null}
                {companySettings.line_qr_code_url ? (
                  <div className="company-info-qr">
                    <img src={companySettings.line_qr_code_url} alt="LINE QR Code" loading="lazy" />
                  </div>
                ) : null}
                {companySettings.copyright_text ? <p className="muted">{companySettings.copyright_text}</p> : null}
              </section>
            </div>
          </aside>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2>物件特色</h2>
          {property.highlights?.length ? (
            <ul>
              {property.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">物件特色整理中。</p>
          )}
          <h2>詳細介紹</h2>
          <p style={{ whiteSpace: "pre-line", lineHeight: 1.9 }}>{property.description || "詳細介紹整理中。"}</p>
        </div>
      </section>
    </main>
  );
}
