import type { Metadata } from "next";
import Link from "next/link";
import { listPublicAreaPages } from "@/lib/areas-cms";
import { getPublicCompanySettings } from "@/lib/company-settings";

export const runtime = "edge";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getPublicCompanySettings();
  const title = `彰化地區房屋與土地資訊｜${company.brand_name}`;
  const description = "查看彰化市、秀水鄉、鹿港鎮的房屋、土地、店面與廠房資訊，依地區了解買房、賣房與委託服務重點。";
  return { title, description, alternates: { canonical: "/areas" }, openGraph: { title, description, siteName: company.brand_name, url: "/areas" } };
}

export const dynamic = "force-dynamic";

export default async function AreasPage() {
  const areaPages = await listPublicAreaPages();
  return <main>
    <section className="hero-lite area-index-hero"><div className="container"><p className="area-eyebrow">Local Service</p><h1>從熟悉的地區，開始找房或規劃出售</h1><p>先整理彰化市、秀水鄉與鹿港鎮。每個地區的住宅、土地與交易條件不同，阿勇陪您從實際需求出發。</p></div></section>
    <section className="section"><div className="container">
      <nav className="breadcrumb" aria-label="麵包屑"><Link href="/">首頁</Link><span aria-hidden="true">/</span><span>服務地區</span></nav>
      <div className="area-index-grid">
        {areaPages.map((area, index) => <article className="area-index-card" key={area.slug}>
          <span className="area-card-number">0{index + 1}</span><p className="area-eyebrow">{area.eyebrow}</p><h2>{area.name}</h2><p>{area.summary}</p>
          <ul>{area.propertyKeywords.map((keyword) => <li key={keyword}>{keyword}</li>)}</ul>
          <Link className="button" href={`/areas/${area.slug}`}>查看{area.shortName}地區資訊</Link>
        </article>)}
      </div>
    </div></section>
  </main>;
}
