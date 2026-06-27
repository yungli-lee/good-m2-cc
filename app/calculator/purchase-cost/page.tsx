import Link from "next/link";
import { PurchaseCostCalculator } from "@/components/calculators/purchase-cost-calculator";

export const metadata = {
  title: "買房總成本試算｜阿勇不動產顧問",
  description: "輸入成交價、貸款成數、房屋評定現值與常見費用，估算購屋一次性現金需求。",
  alternates: {
    canonical: "/calculator/purchase-cost"
  },
  openGraph: {
    title: "買房總成本試算｜阿勇不動產顧問",
    description: "輸入成交價、貸款成數、房屋評定現值與常見費用，估算購屋一次性現金需求。",
    url: "/calculator/purchase-cost",
    siteName: "阿勇不動產顧問"
  }
};

export default function PurchaseCostCalculatorPage() {
  return (
    <main>
      <section className="hero-lite">
        <div className="container">
          <h1>買房總成本試算</h1>
          <p>把成交價、自備款、仲介費、契稅、印花稅與常見雜支放在同一張表裡，先抓出購屋現金需求的大方向。</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">首頁</Link>
            <span>＞</span>
            <Link href="/calculator">房產試算工具</Link>
            <span>＞</span>
            <strong>買房總成本試算</strong>
          </nav>
          <PurchaseCostCalculator />
          <p className="muted" style={{ marginTop: 24 }}>
            本試算為簡化估算。契稅依房屋評定現值課徵，且僅針對建物課徵，土地不課契稅；實際購屋成本仍會因土地與建物公告現值、房屋評定現值、貸款條件、銀行費用、代書實際收費、規費、履約保證費分攤方式與個案條件不同而有所差異。實際金額仍應以合約、代書與相關機關核定資料為準。
          </p>
        </div>
      </section>
    </main>
  );
}
