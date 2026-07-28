import type { Metadata } from "next";
import Link from "next/link";
import { OwnerNetAllInCalculator } from "@/components/calculator/owner-net-all-in-calculator";
import { getPublicCompanySettings } from "@/lib/company-settings";
import { siteOrigin } from "@/lib/home-cms/routing";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getPublicCompanySettings();
  const origin = siteOrigin();
  const url = `${origin}/calculators/owner-net-all-in`;
  const title = `屋主實拿試算｜費稅外加｜${company.brand_name}`;
  const description = "輸入屋主希望實拿金額、取得成本、仲介費及相關稅費，快速反推房屋建議成交總價。";
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { title, description, url, siteName: company.brand_name, type: "website" },
    twitter: { card: "summary_large_image", title, description }
  };
}

export default function PublicOwnerNetAllInPage() {
  return <main><section className="hero-lite"><div className="container"><p className="eyebrow">SELLER CALCULATOR</p><h1>屋主實拿試算｜費稅外加</h1><p>輸入屋主希望實拿金額、取得成本與相關費用，反推預估成交總價及應負擔的稅費。</p></div></section><section className="section"><div className="container"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">首頁</Link><span>＞</span><Link href="/calculators">房產試算工具</Link><span>＞</span><strong>屋主實拿試算</strong></nav><OwnerNetAllInCalculator mode="public" /><Link className="button ghost" href="/calculators">返回房產試算工具</Link></div></section></main>;
}
