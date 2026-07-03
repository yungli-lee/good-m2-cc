import Link from "next/link";
import { requireRole } from "@/lib/auth";

export const runtime = "edge";

const tools = [
  {
    title: "賣屋淨利反推成交價",
    description: "依買入成本、出售費率與目標稅後淨利，反推建議最低成交價。",
    href: "/admin/tools/seller-net-profit"
  },
  {
    title: "屋主實拿｜全部費稅外加",
    description: "屋主指定實拿金額，其餘仲介費、土增稅、房地合一稅與雜支全部外加。",
    href: "/admin/tools/owner-net-all-in"
  },
  {
    title: "屋主售價｜仲介費另計",
    description: "屋主售價固定，仲介服務費另外計算，並估算售價扣除稅費後的屋主淨收。",
    href: "/admin/tools/owner-net-brokerage-extra"
  },
  {
    title: "購屋能力分析",
    description: "依自備款、貸款成數與購屋成本，快速估算買方可優先看的房價帶。",
    href: "/admin/tools/buyer-budget"
  }
];

export default async function AdminToolsPage() {
  await requireRole(["editor", "admin", "owner"]);

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>成交試算中心</h1>
            <p className="muted">整合賣方與買方常用成交試算工具。</p>
          </div>
          <Link className="button ghost" href="/admin">回後台首頁</Link>
        </div>

        <div className="grid">
          {tools.map((tool) => (
            <article className="card" key={tool.href}>
              <div className="card-body" style={{ display: "grid", gap: 12 }}>
                <h2 style={{ margin: 0 }}>{tool.title}</h2>
                <p className="muted" style={{ margin: 0 }}>{tool.description}</p>
                <div>
                  <Link className="button" href={tool.href}>進入試算</Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="notice" style={{ marginTop: 18 }}>本工具為估算輔助，實際稅費仍應依地政、稅捐、代書及國稅局資料為準。</div>
      </div>
    </main>
  );
}
