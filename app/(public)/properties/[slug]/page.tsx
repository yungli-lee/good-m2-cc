import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatPing, formatPrice, propertyTypeLabel } from "@/lib/format";
import { getPublishedPropertyBySlug } from "@/lib/properties/queries";
import type { Property } from "@/lib/properties/types";
import { getCoverMedia } from "@/lib/properties/types";

export const runtime = "edge";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getPublishedPropertyBySlug(slug);
  const property = data as Property | null;
  if (!property) return { title: "物件不存在｜阿勇不動產顧問" };
  const cover = getCoverMedia(property);
  return {
    title: property.seo_title || `${property.title}｜阿勇不動產顧問`,
    description: property.meta_description || property.description?.slice(0, 120) || "主推物件詳細資訊",
    openGraph: {
      title: property.seo_title || property.title,
      description: property.meta_description || property.description || undefined,
      images: property.og_image_url || cover?.url ? [property.og_image_url || cover!.url] : undefined
    },
    alternates: property.canonical_url ? { canonical: property.canonical_url } : undefined
  };
}

export default async function PropertyDetailPage({ params }: Props) {
  const { slug } = await params;
  const { data, error } = await getPublishedPropertyBySlug(slug);
  if (error || !data) notFound();

  const property = data as Property;
  const cover = getCoverMedia(property);
  const media = property.property_media?.filter((item) => item.media_type === "image" && !item.deleted_at) || [];

  return (
    <main>
      <section className="section">
        <div className="container detail-layout">
          <div className="gallery">
            {cover ? (
              <img className="gallery-main" src={cover.url} alt={cover.alt_text || property.title} />
            ) : (
              <div className="gallery-main" role="img" aria-label={`${property.title} 尚未設定封面照片`} />
            )}
            <div className="media-grid">
              {media.map((item) => (
                <img key={item.id} className="property-image" src={item.url} alt={item.alt_text || property.title} loading="lazy" />
              ))}
            </div>
          </div>
          <aside className="card">
            <div className="card-body">
              <h1 style={{ marginTop: 0 }}>{property.title}</h1>
              <div className="price">{formatPrice(property.price)}</div>
              <p>{property.address_public || "地址洽詢"}</p>
              <p>類型：{propertyTypeLabel(property.property_type)}</p>
              <p>土地：{formatPing(property.land_area_ping)}</p>
              <p>建物：{formatPing(property.building_area_ping)}</p>
              <p>格局：{property.layout || "-"}</p>
              <p>屋齡：{property.age == null ? "-" : `${property.age} 年`}</p>
              <p>座向：{property.orientation || "-"}</p>
              <div className="actions">
                <a className="button" href="https://line.me/R/ti/p/@buyhouse4" target="_blank" rel="noreferrer">
                  Line 阿勇諮詢
                </a>
                <a className="button secondary" href="#inquiry">
                  填寫服務表單
                </a>
              </div>
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
      <section className="section" id="inquiry">
        <div className="container">
          <div className="notice">物件詢問表單將在 Sprint C 串接完整安全流程；目前可先使用 Line 阿勇諮詢。</div>
        </div>
      </section>
    </main>
  );
}
