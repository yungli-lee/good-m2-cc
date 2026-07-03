import Link from "next/link";
import { BuyerBudgetCalculator } from "@/components/calculator/buyer-budget-calculator";
import { requireRole } from "@/lib/auth";

export const runtime = "edge";

export default async function AdminBuyerBudgetToolPage() {
  await requireRole(["editor", "admin", "owner"]);

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>購屋能力分析</h1>
            <p className="muted">依自備款、貸款成數與購屋成本，快速估算買方可優先看的房價帶。</p>
          </div>
          <Link className="button ghost" href="/admin/tools">回成交試算中心</Link>
        </div>

        <BuyerBudgetCalculator />
      </div>
    </main>
  );
}
