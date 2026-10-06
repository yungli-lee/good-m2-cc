import Link from "next/link";
import { PropertyCard } from "@/components/properties/property-card";
import { CollectionShare } from "@/components/properties/collection-share";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { collectionHref, collectionLabel } from "@/lib/properties/collection-link";
import { listPublishedPropertiesByIds, searchPublishedProperties } from "@/lib/properties/queries";
import type { Property } from "@/lib/properties/types";
import { propertyCollectionFilters, propertyCollectionHref, type PropertyCollection } from "@/lib/property-collections/core";
import { getCollectionCover } from "@/lib/property-collections/social";
import { siteOrigin } from "@/lib/home-cms/routing";

export async function PropertyCollectionPage({ collection, preview = false }: { collection: PropertyCollection; preview?: boolean }) {
  const filters = propertyCollectionFilters(collection);
  const [result, company] = await Promise.all([
    collection.selection_mode === "manual"
      ? listPublishedPropertiesByIds(collection.selected_property_ids)
      : searchPublishedProperties(filters.q, 1000, filters),
    getPublicCompanySettings()
  ]);
  const cover = getCollectionCover(collection.cover_storage_path);
  const isManual = collection.selection_mode === "manual";
  return <main>
    {preview ? <div className="container notice">後台預覽：只有已發布主題可分享給客人。<Link href={`/admin/property-collections/${collection.id}/edit`}>返回編輯</Link></div> : null}
    <section className="section"><div className="container collection-landing-header">
      {cover ? <img className="collection-landing-cover" src={cover} alt={collection.title} width={1200} height={630} fetchPriority="high" /> : null}
      <div><p className="eyebrow">阿勇與阿美精選物件</p><h1>{collection.title}</h1><p className="collection-description">{collection.description || "一次比較合適的物件，阿勇與阿美可以為你詳細介紹。"}</p>
        <p className="muted">{isManual ? `精選指定：${collection.selected_property_ids.length} 件` : `搜尋條件：${collectionLabel(filters)}`}</p>
        <div className="actions">{!isManual ? <Link className="button ghost" href={collectionHref(filters)}>調整搜尋條件</Link> : null}<a className="button" href={company.line_url} target="_blank" rel="noreferrer" data-contact-person="阿勇" data-cta-location="collection_intro">LINE 阿勇諮詢</a></div>
        {!preview ? <CollectionShare href={propertyCollectionHref(collection.slug)} title={collection.title} origin={siteOrigin()} /> : null}
      </div>
    </div></section>
    <section className="section"><div className="container">
      <h2>{isManual ? "本期精選物件" : "目前在售物件"}</h2>
      {result.error ? <div className="notice">目前物件資料讀取失敗，請稍後再試。</div> : <p>{result.data?.length || 0} 件在售物件{isManual ? "；依阿勇設定順序呈現。" : "；清單隨在售物件更新。"}</p>}
      <div className="grid">{(result.data as Property[] | null)?.map(property => <PropertyCard key={property.id} property={property} />)}</div>
      {!result.error && !result.data?.length ? <div className="notice">這批物件目前沒有可公開的在售物件。<Link href="/properties">看看其他物件</Link>，或把需求告訴阿勇。</div> : null}
    </div></section>
  </main>;
}
