import Link from "next/link";
import { MortgageCalculator } from "@/components/calculators/mortgage-calculator";

export const metadata = {
  title: "房貸月付金試算｜阿勇不動產顧問",
  description: "輸入貸款金額、年限、寬限期與三段式利率，估算月付金、總利息與利率跳升提醒。",
  alternates: {
    canonical: "/calculator/mortgage"
  },
  openGraph: {
    title: "房貸月付金試算｜阿勇不動產顧問",
    description: "輸入貸款金額、年限、寬限期與三段式利率，估算月付金、總利息與利率跳升提醒。",
    url: "/calculator/mortgage",
    siteName: "阿勇不動產顧問"
  }
};

export default function MortgageCalculatorPage() {
  return (
    <main>
      <section className="hero-lite">
        <div className="container">
          <h1>房貸月付金試算</h1>
          <p>輸入貸款條件，快速估算每月還款金額、總利息與寬限期後可能增加的負擔。</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">首頁</Link>
            <span>＞</span>
            <Link href="/calculator">房產試算工具</Link>
            <span>＞</span>
            <strong>房貸月付金試算</strong>
          </nav>
          <MortgageCalculator />
          <p className="muted" style={{ marginTop: 24 }}>
            本試算為初步估算，實際核貸條件、利率與每期金額仍以銀行審核與合約為準。
          </p>
        </div>
      </section>
    </main>
  );
}
