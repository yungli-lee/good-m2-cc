import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

type AdminUserListItem = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  created_at: string | null;
  deleted_at: string | null;
};

type Props = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const errorMessage: Record<string, string> = {
  forbidden: "權限不足，無法執行此操作。",
  invalid_request: "請求資料格式不正確。",
  not_found: "找不到指定使用者。",
  request_failed: "操作失敗，請稍後再試。"
};

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireRole(["admin", "owner"]);
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,role,created_at,deleted_at")
    .order("created_at", { ascending: false });
  const users = (data || []) as AdminUserListItem[];

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>使用者管理</h1>
            <p className="muted">P0 安全底座：目前先提供使用者清單，角色調整與停用操作已由 server actions 保護。</p>
          </div>
          <Link className="button ghost" href="/admin">返回後台</Link>
        </div>

        {query.saved ? <div className="notice">已儲存。</div> : null}
        {query.error ? <div className="notice">{errorMessage[query.error] || "操作失敗，請稍後再試。"}</div> : null}
        {error ? <div className="notice">使用者資料讀取失敗。</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>顯示名稱</th>
                <th>Role</th>
                <th>Status</th>
                <th>建立時間</th>
                <th>最後登入</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email || "-"}</td>
                  <td>{user.display_name || "-"}</td>
                  <td>{user.role}</td>
                  <td>{user.deleted_at ? `停用：${formatDateTime(user.deleted_at)}` : "啟用"}</td>
                  <td>{formatDateTime(user.created_at)}</td>
                  <td className="muted">planned</td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td colSpan={6}>尚無使用者資料。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
