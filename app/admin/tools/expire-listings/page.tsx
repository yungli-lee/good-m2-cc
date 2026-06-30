import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { canPublishProperties } from "@/lib/auth";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ count?: string; items?: string; error?: string }>;
};

function parseItems(value?: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        title: typeof item.title === "string" ? item.title : "未命名物件",
        listing_end_date: typeof item.listing_end_date === "string" ? item.listing_end_date : "-"
      }))
      .slice(0, 50);
  } catch {
    return [];
  }
}

export default async function ExpireListingsToolPage({ searchParams }: Props) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const canRun = canPublishProperties(current.profile.role);
  const query = await searchParams;
  const items = parseItems(query.items);
  const count = Number(query.count || 0);

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>檢查委託到期物件</h1>
            <p className="muted">只會下架已上架且委託迄日已過期的物件，不會刪除物件。</p>
          </div>
          <Link className="button ghost" href="/admin">回後台首頁</Link>
        </div>

        {query.error ? <div className="notice">執行失敗：{query.error}</div> : null}
        {!canRun ? <div className="notice">只有 owner / admin 可執行此工具。</div> : null}

        {canRun ? (
          <form action="/admin/tools/expire-listings/run" method="post" className="actions" style={{ marginBottom: 18 }}>
            <button className="button" type="submit">檢查並下架到期物件</button>
          </form>
        ) : null}

        {query.count ? (
          <div className="card">
            <div className="card-body">
              <h2 style={{ marginTop: 0 }}>執行結果</h2>
              <p>已下架 {count.toLocaleString("zh-TW")} 筆。</p>
              {items.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>案名</th>
                        <th>委託到期日</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={`${item.title}-${index}`}>
                          <td>{item.title}</td>
                          <td>{item.listing_end_date.replaceAll("-", "/")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
