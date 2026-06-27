import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { UsersManager, type AdminUserListItem } from "@/components/admin/users-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "edge";

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
  const current = await requireRole(["admin", "owner"]);
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
            <p className="muted">管理後台角色、停用狀態與顯示名稱。所有變更都會經過 Server Action 與 audit log。</p>
          </div>
          <Link className="button ghost" href="/admin">返回後台</Link>
        </div>

        {query.saved ? <div className="notice">已儲存。</div> : null}
        {query.error ? <div className="notice">{errorMessage[query.error] || "操作失敗，請稍後再試。"}</div> : null}

        <UsersManager users={users} actorRole={current.profile.role} loadError={Boolean(error)} />
      </div>
    </main>
  );
}
