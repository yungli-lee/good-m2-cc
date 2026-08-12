"use client";

import Link from "next/link";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics/client";

export type HomeProperty = {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  address_public: string | null;
  land_area_ping: number | null;
  building_area_ping: number | null;
  layout: string | null;
  property_type?: string | null;
  highlights?: string[] | null;
  property_media?: Array<{ url?: string | null; alt_text?: string | null; is_cover?: boolean; deleted_at?: string | null }> | null;
};

function cover(property: HomeProperty) {
  const media = property.property_media || [];
  return media.find((item) => item.is_cover && !item.deleted_at) || media.find((item) => !item.deleted_at) || null;
}

function price(value: number | null) {
  return value ? `${value.toLocaleString("zh-TW")} 萬元` : "價格洽詢";
}

function area(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 }).format(value);
}

const landTypes = new Set(["farmland", "building_land", "industrial_land", "land"]);

export function HomePropertyCard({ property }: { property: HomeProperty }) {
  const media = cover(property);
  return (
    <article className="property-discovery-card">
      {media?.url ? <img src={media.url} alt={media.alt_text || property.title} loading="lazy" /> : <div className="property-card-placeholder" role="img" aria-label={`${property.title} 尚未設定封面照片`} />}
      <div className="property-discovery-body">
        <h3>{property.title}</h3>
        <p><strong>{price(property.price)}</strong></p>
        <p>{property.address_public || "地址洽詢"}</p>
        {area(property.land_area_ping) || area(property.building_area_ping) ? <p>{[area(property.land_area_ping) ? `土地 ${area(property.land_area_ping)} 坪` : "", area(property.building_area_ping) ? `建物 ${area(property.building_area_ping)} 坪` : ""].filter(Boolean).join(" / ")}</p> : null}
        {!landTypes.has(property.property_type || "") && property.layout ? <p>{property.layout}</p> : null}
        <Link className="button" href={`/properties/${property.slug}`}>查看詳情</Link>
      </div>
    </article>
  );
}

export function HomePropertySearch({ lineUrl }: { lineUrl: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HomeProperty[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const params = new URLSearchParams({ mode: "search", limit: "24" });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/public/properties?${params}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("搜尋暫時無法使用，請稍後再試。");
      setResults(Array.isArray(body.data) ? body.data : []);
      void trackEvent("search_property", { properties: { query: query.trim() || null, district: null, category: null, price_min: null, price_max: null, result_count: Array.isArray(body.data) ? body.data.length : 0 } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "搜尋暫時無法使用，請稍後再試。");
      setResults(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="property-search-section" id="property-search">
      <div className="section-heading"><p className="eyebrow">Property Search</p><h2>找找看適合的物件</h2><p>輸入地點、預算、類型或生活需求，先看目前公開上架的物件。</p></div>
      <form className="property-search-form" onSubmit={submit}>
        <label>搜尋條件<input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="鹿港、福興、1000萬、800以下、農地、三房" /></label>
        <button className="button primary" type="submit" disabled={pending}>{pending ? "搜尋中…" : "搜尋物件"}</button>
      </form>
      {error ? <p className="notice" role="alert">{error}</p> : null}
      {results ? <div className="property-search-results">
        <div className="property-search-heading"><h3>搜尋結果</h3><Link className="button ghost" href="/properties">查看所有物件</Link></div>
        {results.length ? <div className="property-carousel"><div className="property-card-track">{results.map((item) => <HomePropertyCard property={item} key={item.id} />)}</div></div> : <div className="property-empty-cta"><p>目前沒有符合條件的公開物件，可以直接把需求傳給阿勇協助留意。</p>{lineUrl ? <a className="button primary" href={lineUrl}>Line 阿勇諮詢</a> : null}</div>}
      </div> : null}
    </section>
  );
}
