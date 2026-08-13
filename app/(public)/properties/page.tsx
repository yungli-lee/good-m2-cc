import type { Metadata } from "next";
import Link from "next/link";
import { PropertyCard } from "@/components/properties/property-card";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { listPublishedProperties, listPublishedPropertiesByArea } from "@/lib/properties/queries";
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

type Props = {
  searchParams: Promise<{ city?: string; district?: string; area?: string }>;
};

export default async function PropertiesPage({ searchParams }: Props) {
  const { city, district, area } = await searchParams;
  const hasAreaFilter = Boolean(city && district);
  const { data: properties, error } = hasAreaFilter
    ? await listPublishedPropertiesByArea(city!, district!, 100)
    : await listPublishedProperties();
  const areaName = hasAreaFilter ? district : null;

  return (
    <main>
      <section className="hero-lite">
        <div className="container">
          <h1>{areaName ? `${areaName}公開物件` : "主推物件"}</h1>
          <p>{areaName ? `只顯示${city}${areaName}目前已上架的公開物件。` : "只顯示目前已上架的公開物件，草稿與下架物件不會出現在前台。"}</p>
          {areaName && area ? <div className="actions"><Link className="button ghost" href={`/areas/${area}`}>返回{areaName}地區頁</Link></div> : null}
        </div>
      </section>
      <section className="section">
        <div className="container">
          {error ? <div className="notice">目前物件資料讀取失敗，請稍後再試。</div> : null}
          {!error && (!properties || properties.length === 0) ? (
            <div className="notice">目前{areaName || "主推"}物件整理中，歡迎先透過 Line 洽詢阿勇。</div>
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
