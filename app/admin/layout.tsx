import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentProfile } from "@/lib/auth";
import { canManageUsers } from "@/lib/auth/permissions";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { logoutAction } from "./login/actions";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-good-m2-pathname") || "";
  const current = hasSupabaseConfig() ? await getCurrentProfile() : null;

  if (!current || pathname === "/admin/login" || pathname === "/admin/login/" || pathname === "/admin/pending" || pathname === "/admin/pending/") {
    return <>{children}</>;
  }
  const accountLabel = current.profile.display_name || current.profile.email || current.user.email || "我的帳號";

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="brand" href="/admin/properties">
            後台管理
          </Link>
          <nav className="nav" aria-label="後台導覽">
            <Link href="/admin/properties">物件管理</Link>
            <Link href="/admin/knowledge">知識管理</Link>
            <Link href="/admin/media">媒體庫</Link>
            <Link href="/admin/inquiries">詢問單</Link>
            <Link href="/admin/tools/seller-net-profit">後台工具</Link>
            <Link href="/admin/settings/company">公司資料</Link>
            {canManageUsers(current.profile.role) ? <Link href="/admin/users">使用者管理</Link> : null}
            {current.profile.role === "owner" ? <Link href="/admin/audit">稽核紀錄</Link> : null}
            <Link href="/properties" target="_blank" rel="noopener noreferrer">前台物件</Link>
            <details className="account-menu">
              <summary>{accountLabel}</summary>
              <div className="account-menu-panel">
                <Link href="/admin/account">我的帳號</Link>
                <Link href="/admin/account#password">修改密碼</Link>
                <form action={logoutAction}>
                  <button type="submit">登出</button>
                </form>
              </div>
            </details>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
