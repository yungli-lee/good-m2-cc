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
            <h1 style={{ margin: 0 }}>買方預算反推最高出價</h1>
            <p className="muted">依自備款、貸款與購屋附加成本，反推買方最高可出價。</p>
          </div>
          <Link className="button ghost" href="/admin/tools">回成交試算中心</Link>
        </div>

        <BuyerBudgetCalculator />
      </div>
    </main>
  );
}
