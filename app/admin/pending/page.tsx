import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logoutAction } from "../login/actions";
import { isAdminRole } from "@/types/auth/admin";

export const runtime = "edge";

export default async function AdminPendingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email,role,deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.deleted_at) redirect("/admin/login?error=forbidden");
  if (profile && isAdminRole(profile.role)) redirect("/admin");

  const email = profile?.email || user.email || "-";

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 620 }}>
        <div className="card">
          <div className="card-body" style={{ display: "grid", gap: 14 }}>
            <h1 style={{ margin: 0 }}>歡迎使用阿勇不動產顧問後台</h1>
            <div>
              <p className="muted" style={{ marginBottom: 6 }}>您的帳號：</p>
              <strong style={{ color: "#102343", fontSize: 22 }}>{email}</strong>
            </div>
            <p style={{ margin: 0 }}>目前尚未開通後台權限。</p>
            <p style={{ margin: 0 }}>請聯絡系統管理員。</p>
            <p className="muted" style={{ margin: 0 }}>
              若管理員稍後升級權限，重新整理即可進入後台。
            </p>
            <div className="actions">
              <a className="button" href="/admin/pending">重新整理</a>
              <form action={logoutAction}>
                <button className="button ghost" type="submit">登出</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
