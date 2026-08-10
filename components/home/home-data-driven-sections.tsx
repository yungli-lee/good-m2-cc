import Link from "next/link";
import { KnowledgeCard } from "@/components/content/knowledge-card";
import { HomePropertyCard, HomePropertySearch, type HomeProperty } from "@/components/home/home-property-search";
import type { ContentItem } from "@/lib/content/types";

export function HomePropertyCollection({ kind, properties }: { kind: "featured" | "latest"; properties: HomeProperty[] }) {
  const featured = kind === "featured";
  return (
    <section className="problem-section" id={featured ? "featured-properties" : "latest-properties"}>
      <div className="section-heading">
        <p className="eyebrow">{featured ? "Featured Properties" : "Latest Listings"}</p>
        <h2>{featured ? "精選物件" : "最新上架物件"}</h2>
        <p>{featured ? "阿勇嚴選目前主推案源，歡迎進一步了解。" : "依最近上架時間整理，方便快速掌握新內容。"}</p>
      </div>
      {properties.length ? <div className="property-discovery"><div className="property-carousel"><div className="property-card-track">{properties.map((property) => <HomePropertyCard property={property} key={property.id} />)}</div></div><div className="property-carousel-actions"><Link className="button" href="/properties">查看更多物件</Link></div></div> : <p className="note">目前{featured ? "精選" : "公開"}物件整理中，歡迎稍後再查看。</p>}
    </section>
  );
}

export function HomeKnowledgePreview({ items }: { items: ContentItem[] }) {
  if (!items.length) return null;
  return (
    <section className="knowledge-preview-section" id="knowledge-preview">
      <div className="section-heading"><p className="eyebrow">Knowledge Base</p><h2>最新不動產知識</h2><p>整理買屋、賣屋、稅務、貸款、農地農舍與法規重點，協助您先建立判斷基礎。</p></div>
      <div className="knowledge-preview-grid">{items.map((item) => <KnowledgeCard item={item} key={item.id} />)}</div>
      <div className="knowledge-preview-actions"><Link className="button" href="/knowledge">前往知識庫</Link></div>
    </section>
  );
}

export { HomePropertySearch };
