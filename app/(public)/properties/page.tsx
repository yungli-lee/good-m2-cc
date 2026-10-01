import type { Metadata } from "next";
import Link from "next/link";
import { PropertyCard } from "@/components/properties/property-card";
import { CollectionShare } from "@/components/properties/collection-share";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { listPublishedProperties, searchPublishedProperties } from "@/lib/properties/queries";
import { collectionFilters, collectionHref, collectionLabel, collectionDistricts, collectionTypes, type CollectionSearchParams } from "@/lib/properties/collection-link";
import { siteOrigin } from "@/lib/home-cms/routing";
import { resolveHomeSocialImage } from "@/lib/home-social-metadata";
import { getCachedHomeSocialImageUrl } from "@/lib/home-social-settings";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Property } from "@/lib/properties/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<CollectionSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = collectionFilters(await searchParams);
  const [company, image] = await Promise.all([getPublicCompanySettings(), resolveHomeSocialImage({ load: getCachedHomeSocialImageUrl, supabaseOrigin: getSupabaseEnv().url })]);
  const title = `${collectionLabel(filters)}｜${company.brand_name}`;
  const description = `一次瀏覽${collectionLabel(filters)}，阿勇與阿美可以為你詳細介紹。僅顯示目前公開在售物件。`;
  const url = `${siteOrigin()}${collectionHref(filters)}`;
  return { title, description, alternates: { canonical: "/properties" },
    robots: filters.q || filters.city || filters.districts.length || filters.type ? { index: false, follow: true } : undefined,
    openGraph: { title, description, siteName: company.brand_name, url, type: "website", images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] }
  };
}

export default async function PropertiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters = collectionFilters(params);
  const filtered = Boolean(filters.q || filters.city || filters.districts.length || filters.type);
  const { data: properties, error } = filtered ? await searchPublishedProperties(filters.q, 1000, filters) : await listPublishedProperties();
  const label = collectionLabel(filters);
  const area = typeof params.area === "string" ? params.area : "";
  return <main>
    <section className="hero-lite"><div className="container">
      <h1>{label}</h1><p>一次比較適合的物件，再由阿勇與阿美為你詳細介紹。</p>
      <form key={collectionHref(filters)} action="/properties" method="get" className="collection-search-form">
        <label>搜尋條件<input className="input" name="q" type="search" defaultValue={filters.q} maxLength={200} placeholder="例如：福興＋秀水 農地 1000萬以下" /></label>
        <p className="collection-search-help">多個地區可用 ＋、逗號或空格分隔，例如「福興＋秀水 農地」；類型與預算會一起篩選。</p>
        {filters.city ? <input name="city" type="hidden" value={filters.city} /> : null}
        <label>物件類型<select className="select" name="type" defaultValue={filters.type}><option value="">全部類型</option>{Object.entries(collectionTypes).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}</select></label>
        <details><summary>選擇地區（可複選）{filters.districts.length ? `：${filters.districts.join("、")}` : ""}</summary><fieldset className="collection-districts"><legend>包含任一勾選地區的物件</legend>{collectionDistricts.map(d => <label key={d}><input type="checkbox" name="district" value={d} defaultChecked={filters.districts.includes(d)} />{d}</label>)}</fieldset></details>
        <div className="actions"><button className="button" type="submit">搜尋物件</button><Link className="button ghost" href="/properties">清除條件</Link></div>
      </form>
      <nav className="actions" aria-label="常用物件搜尋">{[{ q: "鹿港農地", text: "鹿港農地" }, { q: "鹿港住宅", text: "鹿港住宅" }, { q: "福興", text: "福興物件" }, { q: "秀水", text: "秀水物件" }].map(item => <Link key={item.q} className="button ghost" href={collectionHref(collectionFilters({ q: item.q }))}>{item.text}</Link>)}</nav>
      <CollectionShare href={collectionHref(filters)} title={label} origin={siteOrigin()} />
      {area && filters.districts.length === 1 ? <Link className="button ghost" href={`/areas/${encodeURIComponent(area)}`}>返回地區頁</Link> : null}
    </div></section>
    <section className="section"><div className="container">
      {error ? <div className="notice">目前物件資料讀取失敗，請稍後再試。</div> : <p>{properties?.length || 0} 件在售物件</p>}
      {!error && !properties?.length ? <div className="notice">目前沒有符合條件的在售物件，可以調整條件，或把需求告訴阿勇。</div> : null}
      <div className="grid">{(properties as Property[] | null)?.map(property => <PropertyCard key={property.id} property={property} />)}</div>
    </div></section>
  </main>;
}
