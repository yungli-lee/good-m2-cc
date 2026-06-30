import Link from "next/link";
import { changeOwnPasswordAction, updateOwnDisplayNameAction } from "./actions";
import { requireRole } from "@/lib/auth";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{ error?: string; saved?: string; section?: string }>;
};

const errorMessage: Record<string, string> = {
  current_password_invalid: "目前密碼不正確。",
  invalid_display_name: "姓名格式不正確。",
  missing_email: "帳號缺少 Email，無法修改密碼。",
  password_mismatch: "新密碼與確認密碼不一致。",
  password_reused: "新密碼不可與目前密碼相同。",
  weak_password: "新密碼至少 12 碼，且需包含大小寫英文字母、數字與特殊字元。",
  password_update_failed: "密碼更新失敗，請稍後再試。",
  profile_update_failed: "姓名更新失敗，請稍後再試。",
  session_refresh_failed: "密碼已更新，但 Session 更新失敗，請重新登入。"
};

const savedMessage: Record<string, string> = {
  password: "密碼已更新，Session 已重新整理。",
  profile: "帳號資料已更新。"
};

export default async function AdminAccountPage({ searchParams }: Props) {
  const current = await requireRole(["editor", "admin", "owner"]);
  const query = await searchParams;
  const email = current.profile.email || current.user.email || "-";
  const sectionId = query.section === "password" ? "password" : undefined;

  return (
    <main className="section">
      <div className="container account-settings">
        <div className="actions account-settings-header">
          <div>
            <h1 style={{ margin: 0 }}>我的帳號</h1>
            <p className="muted">更新個人資料與登入密碼。</p>
          </div>
          <Link className="button ghost" href="/admin">返回後台</Link>
        </div>

        {query.saved ? <div className="notice">{savedMessage[query.saved] || "已儲存。"}</div> : null}
        {query.error ? <div className="notice">{errorMessage[query.error] || "操作失敗，請稍後再試。"}</div> : null}

        <section className="account-settings-panel" aria-labelledby="account-profile-title">
          <div>
            <h2 id="account-profile-title">帳號資料</h2>
            <p className="muted">此名稱會顯示於後台右上角與使用者管理。</p>
          </div>
          <form action={updateOwnDisplayNameAction} className="account-settings-form">
            <label className="field">
              <span>Email</span>
              <input className="input" value={email} disabled />
            </label>
            <label className="field">
              <span>姓名</span>
              <input className="input" name="display_name" defaultValue={current.profile.display_name || ""} maxLength={120} autoComplete="name" />
            </label>
            <div className="actions">
              <button className="button" type="submit">儲存姓名</button>
            </div>
          </form>
        </section>

        <section className="account-settings-panel" id="password" aria-labelledby="account-password-title">
          <div>
            <h2 id="account-password-title">修改密碼</h2>
            <p className="muted">新密碼至少 12 碼，並包含大小寫、數字與特殊字元。</p>
          </div>
          <form action={changeOwnPasswordAction} className="account-settings-form">
            <label className="field">
              <span>目前密碼</span>
              <input className="input" name="current_password" type="password" autoComplete="current-password" required autoFocus={sectionId === "password"} />
            </label>
            <label className="field">
              <span>新密碼</span>
              <input className="input" name="new_password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required />
            </label>
            <label className="field">
              <span>確認新密碼</span>
              <input className="input" name="confirm_password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required />
            </label>
            <div className="actions">
              <button className="button" type="submit">更新密碼</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
