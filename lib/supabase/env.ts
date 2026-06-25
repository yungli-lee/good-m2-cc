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
  const processUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const processAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const runtimeUrl = runtimeEnv?.NEXT_PUBLIC_SUPABASE_URL;
  const runtimeAnon = runtimeEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = processUrl || runtimeUrl;
  const anonKey = processAnon || runtimeAnon;
  const source = processUrl && processAnon ? "process" : runtimeUrl && runtimeAnon ? "cloudflare" : "missing";

  console.log({
    source,
    hasUrl: !!url,
    hasAnon: !!anonKey
  });

  return {
    url,
    anonKey,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY
  };
}
