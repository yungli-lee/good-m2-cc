import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

type SupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function hasSupabaseConfig() {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
}

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error("auth_not_configured");
  }

  const cookieStore = await cookies();
  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: SupabaseCookie[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components can read cookies but cannot always write them.
          }
        }
      }
    }
  );
}

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase URL and service role key must be configured before using Supabase admin APIs.");
  }

  return createClient(
    url,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
