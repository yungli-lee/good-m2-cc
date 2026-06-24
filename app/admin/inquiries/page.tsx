import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

const statusLabel: Record<string, string> = {
  new: "新詢問",
  contacted: "已聯絡",
  in_progress: "處理中",
  closed: "已結案",
  spam: "垃圾訊息",
  rate_limited: "頻率限制",
  turnstile_failed: "驗證失敗"
};

function maskPhone(phone?: string | null) {
  if (!phone) return "-";
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

export default async function AdminInquiriesPage() {
  await requireRole(["editor", "admin", "owner"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("id,created_at,form_type,name,phone,email,message,source_page,status,spam_reason,property_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="section">
      <div className="container">
        <h1>詢問單管理</h1>
        <p className="muted">列表遮蔽部分個資，完整內容請進入詳細頁查看。</p>
        {error ? <div className="notice">詢問單讀取失敗。</div> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>時間</th>
                <th>類型</th>
                <th>姓名</th>
                <th>手機</th>
                <th>內容</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((item) => (
                <tr key={item.id}>
                  <td>{formatDateTime(item.created_at)}</td>
                  <td>{item.form_type}</td>
                  <td>{item.name || "-"}</td>
                  <td>{maskPhone(item.phone)}</td>
                  <td>{item.message ? `${item.message.slice(0, 36)}...` : "-"}</td>
                  <td>{statusLabel[item.status] || item.status}</td>
                  <td>
                    <Link className="button ghost" href={`/admin/inquiries/${item.id}`}>查看</Link>
                  </td>
                </tr>
              ))}
              {!data?.length ? (
                <tr>
                  <td colSpan={7}>尚無詢問單。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
