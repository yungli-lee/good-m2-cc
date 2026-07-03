import Link from "next/link";
import { OwnerNetBrokerageExtraCalculator } from "@/components/calculator/owner-net-brokerage-extra-calculator";
import { requireRole } from "@/lib/auth";

export const runtime = "edge";

export default async function AdminOwnerNetBrokerageExtraToolPage() {
  await requireRole(["editor", "admin", "owner"]);

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>屋主實拿｜仲介費另計</h1>
            <p className="muted">反推成交價，仲介費另外列示，屋主實拿回到指定目標。</p>
          </div>
          <Link className="button ghost" href="/admin/tools">回成交試算中心</Link>
        </div>

        <OwnerNetBrokerageExtraCalculator />
      </div>
    </main>
  );
}
