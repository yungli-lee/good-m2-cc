import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseEnvDebugAllowed } from "@/lib/supabase/env";

type SupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const isAdminPath = path.startsWith("/admin") || path.startsWith("/api/admin");
  const isAdminLoginPath = path === "/admin/login" || path === "/admin/login/";
  const isAdminEnvDebugPath = path === "/admin/debug/env" || path === "/admin/debug/env/";

  if (!isAdminPath || isAdminLoginPath || (isAdminEnvDebugPath && isSupabaseEnvDebugAllowed())) return response;

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
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
  if (!data.user) {
    if (path.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
