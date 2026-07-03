import Link from "next/link";
import { SellerNetProfitCalculator } from "@/components/admin/seller-net-profit-calculator";
import { requireRole } from "@/lib/auth";

export const runtime = "edge";

export default async function AdminSellerNetProfitToolPage() {
  await requireRole(["editor", "admin", "owner"]);

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>賣屋淨利反推成交價</h1>
            <p className="muted">後台工具：依買入成本、出售費率與目標稅後淨利，反推建議最低成交價。</p>
          </div>
          <Link className="button ghost" href="/admin/tools">回成交試算中心</Link>
        </div>

        <SellerNetProfitCalculator />
        <div className="notice" style={{ marginTop: 18 }}>本工具為估算輔助，實際稅費仍應依地政、稅捐、代書及國稅局資料為準。</div>
      </div>
    </main>
  );
}
