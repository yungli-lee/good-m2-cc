import Link from "next/link";
import { requireRole } from "@/lib/auth";

export const runtime = "edge";

export default async function AdminRealPricePage() {
  await requireRole(["editor", "admin", "owner"]);
  return (
    <main className="section">
      <div className="container">
        <h1>實價登錄管理</h1>
        <p className="muted">既有實價登錄查詢及成交行情報告的管理入口。</p>
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-body">
            <h2>實價登錄查詢</h2>
            <p className="muted">查看現有資料庫的成交資料及查詢結果。歷史資料補齊與排程匯入仍由既有流程執行。</p>
            <Link className="button secondary" href="/real-price">前往實價登錄查詢</Link>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h2>成交行情報告</h2>
            <p className="muted">上傳內政部官方 Excel，依原始順序選取筆數並製作 A4 成交行情參考報告。</p>
            <Link className="button secondary" href="/admin/real-price-reports">前往成交行情報告</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
