import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminRole } from "@/types/auth/admin";

export const runtime = "edge";

export default async function AdminPendingPage() {
  const current = await getCurrentProfile();
  if (!current) redirect("/admin/login");
  if (isAdminRole(current.profile.role)) redirect("/admin");

  const email = current.profile.email || current.user.email || "-";

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
          </div>
        </div>
      </div>
    </main>
  );
}
