import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { formatPublicPing, formatPropertyPrice, isLandProperty, propertyTypeLabel } from "@/lib/format";
import { getPublishedPropertyBySlug, getPublicPropertyAvailability, listRelatedPublishedProperties, listRetentionPublishedProperties } from "@/lib/properties/queries";
import { resolvePropertySeo } from "@/lib/properties/seo";
import type { Property } from "@/lib/properties/types";
import { PropertyMediaGallery } from "@/components/media/property-media-gallery";
import { PropertyViewTracker } from "@/components/analytics/content-trackers";
import { StructuredData } from "@/components/content/structured-data";
import { ContentRetention } from "@/components/content/content-retention";
import { PropertyCharacterGuide } from "@/components/properties/property-character-guide";
import { getGuideSpeechEnv } from "@/lib/properties/guide-speech-env";
import { buildPropertyGuide } from "@/lib/properties/character-guide";
import { siteOrigin } from "@/lib/home-cms/routing";
import { PropertyCard } from "@/components/properties/property-card";
import { KnowledgeCard } from "@/components/content/knowledge-card";
import { ReminderCard } from "@/components/content/reminder-card";
import { listRelatedKnowledgeForProperty } from "@/lib/content/queries";
import { listPublishedReminderPages } from "@/lib/home-cms/queries";

export const runtime = "edge";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

function publicBuildingTypeLabel(property: Property) {
  if (property.property_type === "apartment") return "無電梯公寓";
  if (property.property_type === "building") {
    if (property.building_subtype === "huaxia") return "華廈";
    if (property.building_subtype === "highrise") return "大樓";
  }
  return propertyTypeLabel(property.property_type);
}

function formatPublicNumber(value?: number | null, suffix = "") {
  if (value == null) return "";
  return `${Number(value).toLocaleString("zh-TW", { maximumFractionDigits: 3 })}${suffix}`;
}

function joinPublicValues(values?: string[] | null) {
  return (values || []).filter(Boolean).join("、");
}


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
    alternates: { canonical: `${siteOrigin()}/properties/${encodeURIComponent(slug)}` },
    openGraph: { title: `此物件已下架｜${company.brand_name}`, description: "此物件資訊已停止公開，歡迎查看其他物件或聯絡阿勇。", siteName: company.brand_name }
  };
  if (!property) return { title: `物件不存在｜${company.brand_name}` };
  const seo = resolvePropertySeo(property, company.brand_name);
  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.ogTitle,
      siteName: company.brand_name,
      description: seo.ogDescription,
      url: seo.canonical,
      images: seo.ogImage ? [seo.ogImage] : undefined
    },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: seo.ogImage ? [seo.ogImage] : undefined },
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
    const matched = ["已成交", "已售出", "已出租"].includes(unavailable.unavailable_reason || "");
    const [properties, knowledge] = await Promise.all([listRetentionPublishedProperties(3), listRelatedKnowledgeForProperty("", 3)]);
    return <main className="property-unavailable-page" data-analytics-location="unavailable"><section className="section"><div className="container property-unavailable-card character-unavailable-card">
      <img className="character-unavailable-team" src="/images/guides/ayong-amei.webp" alt="Q 版阿勇與阿美微笑陪你繼續找房" width={720} height={665} decoding="async" />
      <p className="eyebrow">Property Update</p><h1>{matched ? "啊！本件已經配對成功 ❤️" : "此物件已下架"}</h1>
      <p className="property-unavailable-reason">下架原因：{unavailable.unavailable_reason || (unavailable.status === "expired" ? "委託到期" : "已停止公開")}</p>
      <p className="character-unavailable-greeting">{matched ? "阿美：替這一件找到合適的客戶啦！" : "阿美：這一件目前先休息一下。"}<br />阿勇：別急，我們再陪你看看其他好物件！</p>
      <p>看看下列公開物件，阿勇與阿美可以為你詳細介紹；也可以先逛逛知識庫。</p>
      <div className="actions"><Link className="button" href="/properties">查看其他物件</Link><Link className="button ghost" href="/areas">依地區找房</Link>{companySettings.line_url ? <a className="button ghost" href={companySettings.line_url}>LINE 阿勇諮詢</a> : null}</div>
    </div></section><ContentRetention propertiesFirst properties={properties} knowledge={knowledge} reminders={[]} propertyTitle="我推薦下列公開物件" knowledgeTitle="找房之前，這些知識也用得上" /></main>;
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

  const [relatedProperties, relatedKnowledge, reminderPages] = await Promise.all([
    listRelatedPublishedProperties(property, 3),
    listRelatedKnowledgeForProperty(property.property_type, 3),
    listPublishedReminderPages(3)
  ]);

  const renderCompanyInfo = () => (
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
  );

  const renderPropertySummary = (includeCompanyInfo: boolean) => (
    <aside className="card">
      <div className="card-body">
        <h1 style={{ marginTop: 0 }}>{property.title}</h1>
        <p className="eyebrow">{property.transaction_type === "rent" ? "出租" : "出售"}</p>
        <div className="price">{formatPropertyPrice(property)}</div>
        {property.transaction_type === "rent" ? <div className="rental-terms">{property.deposit_months != null ? <p>押金：{property.deposit_months} 個月</p> : null}{property.minimum_lease_months ? <p>最短租期：{property.minimum_lease_months % 12 === 0 ? `${property.minimum_lease_months / 12} 年` : `${property.minimum_lease_months} 個月`}</p> : null}{property.rental_equipment ? <p style={{ whiteSpace: "pre-wrap" }}>附帶設備／條件：{property.rental_equipment}</p> : null}{property.lease_notarization_required ? <p>租約須經公證</p> : null}</div> : null}
        <p>{property.address_public || "地址洽詢"}</p>
        <p>類型：{publicBuildingTypeLabel(property)}</p>
        {formatPublicPing(property.land_area_ping) ? <p>土地：{formatPublicPing(property.land_area_ping)}</p> : null}
        {formatPublicPing(property.building_area_ping) ? <p>建物：{formatPublicPing(property.building_area_ping)}</p> : null}
        {!isLandProperty(property.property_type) && property.layout ? <p>格局：{property.layout}</p> : null}
        <p>屋齡：{property.age == null ? "-" : `${property.age} 年`}</p>
        <p>座向：{property.orientation || "-"}</p>
        <div className="actions">
          <a className="button" href={companySettings.line_url || "/contact"} data-contact-person="阿勇" target="_blank" rel="noreferrer">
            Line 阿勇諮詢
          </a>
          <Link className="button secondary" href="/#service-form">
            填寫服務表單
          </Link>
        </div>
        {includeCompanyInfo ? renderCompanyInfo() : null}
      </div>
    </aside>
  );


  const isApartmentBuilding = property.property_type === "apartment" || property.property_type === "building";
  const buildingFacts = isApartmentBuilding ? [
    ["型態", publicBuildingTypeLabel(property)],
    ["社區／大樓", property.community_name || ""],
    ["所在樓層", property.floor || ""],
    ["地上樓層", formatPublicNumber(property.above_ground_floors, " 樓")],
    ["地下樓層", formatPublicNumber(property.basement_floors, " 樓")],
    ["總建坪", formatPublicPing(property.building_area_ping) || ""],
    ["主建物", formatPublicPing(property.main_building_area_ping) || ""],
    ["附屬建物", formatPublicPing(property.auxiliary_building_area_ping) || ""],
    ["公設", formatPublicPing(property.shared_area_ping) || ""],
    ["車位坪數", formatPublicPing(property.parking_area_ping) || ""],
    ["格局", property.layout || ""],
    ["座向", property.orientation || ""],
    ["現況用途", joinPublicValues(property.current_usage)],
    ["完工日期", property.completion_date || ""],
    ["總戶數", formatPublicNumber(property.total_units, " 戶")],
    ["電梯數", formatPublicNumber(property.elevator_count, " 部")],
    ["每層戶數", formatPublicNumber(property.units_per_floor, " 戶")],
    ["車位方式", joinPublicValues(property.parking_arrangement)],
    ["管理費", property.management_fee == null ? "" : `${formatPublicNumber(property.management_fee)} 元`]
  ].filter(([, value]) => Boolean(value)) : [];

  const renderBuildingDetails = () => {
    if (!isApartmentBuilding || !buildingFacts.length) return null;

    return (
      <section className="property-building-details" aria-label="建物基本資料">
        <div className="property-building-details-header">
          <h2>建物基本資料</h2>
        </div>
        <dl className="property-facts-grid property-facts-grid-compact">
          {buildingFacts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  };

  const highlightsText = (property.highlights || []).join("\n");

  const renderPropertyCopy = () => (
    <>
      {highlightsText.trim() ? (
        <section className="property-copy-section">
          <h2>物件特色</h2>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>{highlightsText}</p>
        </section>
      ) : null}
      {property.description?.trim() ? (
        <section className="property-copy-section">
          <h2>詳細介紹</h2>
          <p style={{ whiteSpace: "pre-line", lineHeight: 1.9 }}>{property.description}</p>
        </section>
      ) : null}
    </>
  );

  const renderRetentionModules = (idPrefix: string) => (
    <div className="property-retention">
      {relatedProperties.length ? (
        <section className="property-retention-section" aria-labelledby={`${idPrefix}-related-properties-heading`}>
          <div className="property-retention-heading">
            <p className="eyebrow">Keep Exploring</p>
            <h2 id={`${idPrefix}-related-properties-heading`}>你可能也會喜歡</h2>
            <p className="muted">依地區、類型與價格條件，挑幾件可以一起比較的物件。</p>
          </div>
          <div className="grid property-retention-grid">
            {relatedProperties.map((item) => <PropertyCard key={item.id} property={item} />)}
          </div>
          <div className="property-retention-more">
            <Link className="button ghost" href="/properties">看更多物件</Link>
          </div>
        </section>
      ) : null}

      {relatedKnowledge.length ? (
        <section className="property-retention-section" aria-labelledby={`${idPrefix}-related-knowledge-heading`}>
          <div className="property-retention-heading">
            <p className="eyebrow">延伸閱讀</p>
            <h2 id={`${idPrefix}-related-knowledge-heading`}>買屋前可以先看看</h2>
            <p className="muted">看屋之外，也把貸款、交易安全與相關不動產知識先掌握起來。</p>
          </div>
          <div className="grid property-retention-grid">
            {relatedKnowledge.map((item) => <KnowledgeCard key={item.id} item={item} />)}
          </div>
          <div className="property-retention-more">
            <Link className="button ghost" href="/knowledge">前往知識庫</Link>
          </div>
        </section>
      ) : null}

      {reminderPages.length ? (
        <section className="property-retention-section" aria-labelledby={`${idPrefix}-life-reminders-heading`}>
          <div className="property-retention-heading">
            <p className="eyebrow">Life Notes</p>
            <h2 id={`${idPrefix}-life-reminders-heading`}>阿勇生活小提醒</h2>
            <p className="muted">房子的事之外，也整理一些居家生活中真正用得到的小提醒。</p>
          </div>
          <div className="grid property-retention-grid">
            {reminderPages.map((page) => <ReminderCard key={page.id} page={page} />)}
          </div>
        </section>
      ) : null}

      <section className="property-retention-cta">
        <div>
          <p className="eyebrow">想再多了解一點？</p>
          <h2>看中哪一間，阿勇再幫你把重點說清楚。</h2>
          <p>價格、屋況、帶看安排或其他物件，都可以直接問。</p>
        </div>
        <div className="actions">
          {companySettings.line_url ? <a className="button" href={companySettings.line_url} target="_blank" rel="noreferrer">LINE 阿勇諮詢</a> : null}
          <Link className="button secondary" href="/#service-form">填寫服務表單</Link>
        </div>
      </section>
    </div>
  );

  return (
    <main data-property-id={property.id}>
      <StructuredData data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "首頁", item: siteOrigin() }, { "@type": "ListItem", position: 2, name: "物件", item: `${siteOrigin()}/properties` }, { "@type": "ListItem", position: 3, name: property.title, item: resolvePropertySeo(property, companySettings.brand_name).canonical }] }} />
      <PropertyViewTracker propertyId={property.id} properties={{
        property_title: property.title,
        property_category: property.property_type || null,
        city: property.city || null,
        district: property.district || null,
        price: property.price == null ? null : Number(property.price),
        listing_status: property.status || null
      }} />
      <PropertyCharacterGuide slug={property.slug} aiSpeechEnabled={getGuideSpeechEnv().enabled} scripts={buildPropertyGuide(property, publicBuildingTypeLabel(property))} lineUrl={companySettings.line_url || "/contact"} related={relatedProperties.map(item => ({ slug: item.slug, title: item.title }))} />
      <div className="property-detail-desktop">
        <section className="section">
          <div className="container detail-layout">
            <PropertyMediaGallery media={media} title={property.title} propertyId={property.id} />
            {renderPropertySummary(true)}
          </div>
        </section>
        {isApartmentBuilding ? <section className="section property-building-details-section">
          <div className="container">
            {renderBuildingDetails()}
          </div>
        </section> : null}
        {(highlightsText.trim() || property.description?.trim()) ? <section className="section">
          <div className="container">
            {renderPropertyCopy()}
          </div>
        </section> : null}
        <section className="section property-retention-shell">
          <div className="container">
            {renderRetentionModules("desktop")}
          </div>
        </section>
      </div>

      <section className="section property-detail-mobile" aria-label="物件詳細資料">
        <div className="container property-detail-mobile-flow">
          <div data-mobile-section="cover">
            <PropertyMediaGallery media={media} title={property.title} propertyId={property.id} display="cover" />
          </div>
          <div data-mobile-section="summary">
            {renderPropertySummary(false)}
          </div>
          {isApartmentBuilding ? (
            <div data-mobile-section="building-details">
              {renderBuildingDetails()}
            </div>
          ) : null}
          <div data-mobile-section="copy" className="property-detail-mobile-copy">
            {renderPropertyCopy()}
          </div>
          <div data-mobile-section="media">
            <PropertyMediaGallery media={media} title={property.title} propertyId={property.id} display="details" />
          </div>
          <div data-mobile-section="retention">
            {renderRetentionModules("mobile")}
          </div>
          <div data-mobile-section="company" className="card property-detail-mobile-company">
            <div className="card-body">
              {renderCompanyInfo()}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
