import Link from "next/link";
import { OwnerNetAllInCalculator } from "@/components/calculator/owner-net-all-in-calculator";
import { requireRole } from "@/lib/auth";

export const runtime = "edge";

export default async function AdminOwnerNetAllInToolPage() {
  await requireRole(["editor", "admin", "owner"]);

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>屋主實拿｜全部費稅外加</h1>
            <p className="muted">反推成交價，讓屋主實拿等於指定目標，其餘成交費稅外加估算。</p>
          </div>
          <Link className="button ghost" href="/admin/tools">回成交試算中心</Link>
        </div>

        <OwnerNetAllInCalculator />
      </div>
    </main>
  );
}
