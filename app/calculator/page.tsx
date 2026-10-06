import type { Metadata } from "next";
import Link from "next/link";
import { getPublicCompanySettings } from "@/lib/company-settings";

type CalculatorTool =
  | {
      title: string;
      description: string;
      href: string;
      status: string;
      available: true;
    }
  | {
      title: string;
      description: string;
      status: string;
      available: false;
    };

const tools: CalculatorTool[] = [
  {
    title: "房貸月付金試算",
    description: "快速估算每月還款金額，了解寬限期與利率變化後的負擔。",
    href: "/calculator/mortgage",
    status: "已開放",
    available: true
  },
  {
    title: "買房總成本試算",
    description: "一次掌握購屋總支出，先抓出自備款、稅費、仲介費與常見雜支。",
    href: "/calculator/purchase-cost",
    status: "已開放",
    available: true
  },
  {
    title: "屋主實拿試算",
    description: "輸入屋主希望實拿金額及相關稅費，反推預估成交總價。",
    href: "/calculators/owner-net-all-in",
    status: "已開放",
    available: true
  }
];

export async function generateMetadata(): Promise<Metadata> {
  const company = await getPublicCompanySettings();
  return {
  title: `房產試算工具｜${company.brand_name}`,
  description: "買屋、賣屋與房貸相關試算工具。",
  alternates: {
    canonical: "/calculator"
  },
  openGraph: {
    title: `房產試算工具｜${company.brand_name}`,
    description: "買屋、賣屋與房貸相關試算工具。",
    url: "/calculator",
    siteName: company.brand_name
  }
  };
}

export default function CalculatorCenterPage() {
  return (
    <main>
      <section className="hero-lite">
        <div className="container">
          <h1>房產試算工具</h1>
          <p>用簡單試算先掌握方向，再搭配實際條件與專業建議做決定。</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="grid">
            {tools.map((tool) => (
              tool.available ? (
                <Link className="card calculator-route-card" href={tool.href} key={tool.title} style={{ textDecoration: "none" }}>
                  <div className="card-body">
                    <p className="price" style={{ marginTop: 0, fontSize: "0.95rem" }}>{tool.status}</p>
                    <h2>{tool.title}</h2>
                    <p className="muted">{tool.description}</p>
                    <span className="button">立即使用 →</span>
                  </div>
                </Link>
              ) : (
                <article className="card calculator-route-card is-disabled" key={tool.title}>
                  <div className="card-body">
                    <p className="price" style={{ marginTop: 0, fontSize: "0.95rem" }}>{tool.status}</p>
                    <h2>{tool.title}</h2>
                    <p className="muted">{tool.description}</p>
                  </div>
                </article>
              )
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
