import type { Metadata } from "next";
import { PropertyCard } from "@/components/properties/property-card";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { listPublishedProperties } from "@/lib/properties/queries";
import type { Property } from "@/lib/properties/types";

export const runtime = "edge";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getPublicCompanySettings();
  return {
    title: `主推物件｜${company.brand_name}`,
    description: "查看目前已上架的主推物件。",
    openGraph: { siteName: company.brand_name }
  };
}

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const { data: properties, error } = await listPublishedProperties();

  return (
    <main>
      <section className="hero-lite">
        <div className="container">
          <h1>主推物件</h1>
          <p>只顯示目前已上架的公開物件，草稿與下架物件不會出現在前台。</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          {error ? <div className="notice">目前物件資料讀取失敗，請稍後再試。</div> : null}
          {!error && (!properties || properties.length === 0) ? (
            <div className="notice">目前主推物件整理中，歡迎先透過 Line 洽詢阿勇。</div>
          ) : null}
          <div className="grid">
            {(properties as Property[] | null)?.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
