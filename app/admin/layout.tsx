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

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="brand" href="/admin/properties">
            後台管理
          </Link>
          <nav className="nav" aria-label="後台導覽">
            <Link href="/admin/properties">物件管理</Link>
            <Link href="/admin/inquiries">詢問單</Link>
            <Link href="/admin/tools/seller-net-profit">後台工具</Link>
            {canManageUsers(current.profile.role) ? <Link href="/admin/users">使用者管理</Link> : null}
            <Link href="/properties" target="_blank" rel="noopener noreferrer">前台物件</Link>
            {current ? <span>{current.profile.email || current.user.email}</span> : null}
            {current ? (
              <form action={logoutAction}>
                <button className="button ghost" type="submit">登出</button>
              </form>
            ) : null}
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
