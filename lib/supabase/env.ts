type CloudflareRuntimeEnv = Partial<{
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}>;

type CloudflareRequestContext = {
  env?: CloudflareRuntimeEnv;
};

function getCloudflareRuntimeEnv() {
  const contextSymbol = Symbol.for("__cloudflare-request-context__");
  const globalWithContext = globalThis as unknown as {
    [key: symbol]: CloudflareRequestContext | undefined;
  };
  return globalWithContext[contextSymbol]?.env;
}

export function getSupabaseEnv() {
  const runtimeEnv = getCloudflareRuntimeEnv();
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || runtimeEnv?.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || runtimeEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY
  };
}
