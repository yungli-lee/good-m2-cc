import { loginAction } from "./actions";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { isAdminRole } from "@/types/auth/admin";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const current = hasSupabaseConfig() ? await getCurrentProfile() : null;

  if (current && isAdminRole(current.profile.role)) {
    redirect("/admin");
  }

  if (current) {
    redirect("/admin/pending");
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 460 }}>
        <div className="card">
          <div className="card-body">
            <h1 style={{ marginTop: 0 }}>後台登入</h1>
            {params.error === "auth_not_configured" ? <div className="notice">登入服務尚未設定，請先配置 Supabase 環境變數。</div> : null}
            {params.error === "login_failed" ? <div className="notice">登入失敗，請確認帳號或密碼。</div> : null}
            {params.error === "forbidden" ? <div className="notice">此帳號沒有足夠權限。</div> : null}
            <form action={loginAction} className="form-grid" style={{ gridTemplateColumns: "1fr", marginTop: 16 }}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input className="input" id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="field">
                <label htmlFor="password">密碼</label>
                <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <button className="button" type="submit">登入</button>
              <p className="muted">MFA / 2FA 已在 Auth 架構預留，正式啟用時由 Supabase Auth 設定。</p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
