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

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

function describeSupabaseServiceKey(key: string) {
  if (key.startsWith("sb_secret_")) {
    return {
      keyFormat: "supabase_secret_key",
      jwtRole: null,
      jwtRef: null,
      jwtIssuer: null
    };
  }

  if (!key.startsWith("eyJ")) {
    return {
      keyFormat: "unknown",
      jwtRole: null,
      jwtRef: null,
      jwtIssuer: null
    };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(key.split(".")[1] || "")) as Record<string, unknown>;
    return {
      keyFormat: "jwt",
      jwtRole: typeof payload.role === "string" ? payload.role : null,
      jwtRef: typeof payload.ref === "string" ? payload.ref : null,
      jwtIssuer: typeof payload.iss === "string" ? payload.iss : null
    };
  } catch {
    return {
      keyFormat: "jwt",
      jwtRole: null,
      jwtRef: null,
      jwtIssuer: null
    };
  }
}

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
  const authOptions = {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  };
  const globalHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  };

  console.info("[supabase_admin_client_config]", {
    hasUrl: Boolean(url),
    hasServiceRole: Boolean(serviceRoleKey),
    keySource: "service_role",
    serviceKey: describeSupabaseServiceKey(serviceRoleKey),
    auth: authOptions,
    globalHeaderKeys: Object.keys(globalHeaders),
    apikeyHeaderSource: "service_role",
    authorizationHeaderSource: "service_role"
  });

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: authOptions,
      global: {
        headers: globalHeaders
      }
    }
  );
}
