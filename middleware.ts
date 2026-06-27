import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseEnvDebugAllowed } from "@/lib/supabase/env";
import { isAdminRole } from "@/types/auth/admin";

type SupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-good-m2-pathname", path);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const isAdminPath = path.startsWith("/admin") || path.startsWith("/api/admin");
  const isAdminLoginPath = path === "/admin/login" || path === "/admin/login/";
  const isAdminPendingPath = path === "/admin/pending" || path === "/admin/pending/";
  const isForbiddenLoginPath = isAdminLoginPath && request.nextUrl.searchParams.get("error") === "forbidden";
  const isAdminEnvDebugPath = path === "/admin/debug/env" || path === "/admin/debug/env/";

  if (!isAdminPath || (isAdminEnvDebugPath && isSupabaseEnvDebugAllowed())) return response;

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    if (isAdminLoginPath) return response;

    if (path.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Auth service is not configured" }, { status: 503 });
    }

    return NextResponse.redirect(new URL("/admin/login?error=auth_not_configured", request.url));
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: SupabaseCookie[]) => cookies.forEach((cookie) => response.cookies.set(cookie))
      }
    }
  );

  const { data } = await supabase.auth.getUser();
  let role: string | null = null;
  let deletedAt: string | null = null;
  if (data.user && (path.startsWith("/admin") || path.startsWith("/api/admin"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,deleted_at")
      .eq("id", data.user.id)
      .maybeSingle();
    role = profile?.role || "viewer";
    deletedAt = profile?.deleted_at || null;
  }

  if (isAdminLoginPath) {
    if (isForbiddenLoginPath) return response;
    if (!data.user) return response;
    if (deletedAt) return response;
    return isAdminRole(role) ? NextResponse.redirect(new URL("/admin", request.url)) : NextResponse.redirect(new URL("/admin/pending", request.url));
  }

  if (!data.user) {
    if (path.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (path.startsWith("/api/admin")) {
    return response;
  }

  if (!deletedAt && !isAdminRole(role) && !isAdminPendingPath) {
    return NextResponse.redirect(new URL("/admin/pending", request.url));
  }

  if (!deletedAt && isAdminRole(role) && isAdminPendingPath) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
