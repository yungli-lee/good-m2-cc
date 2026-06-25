type CloudflareRuntimeEnv = Partial<{
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CF_PAGES_BRANCH: string;
}>;

type CloudflareRequestContext = {
  env?: CloudflareRuntimeEnv;
};

function getCloudflareRequestContext() {
  const contextSymbol = Symbol.for("__cloudflare-request-context__");
  const globalWithContext = globalThis as unknown as {
    [key: symbol]: CloudflareRequestContext | undefined;
  };
  return globalWithContext[contextSymbol];
}

function getCloudflareRuntimeEnv() {
  return getCloudflareRequestContext()?.env;
}

function getSource(processUrl?: string, processAnon?: string, runtimeUrl?: string, runtimeAnon?: string) {
  if (processUrl && processAnon) return "process";
  if (runtimeUrl && runtimeAnon) return "cloudflare";
  return "missing";
}

export function getSupabaseEnv() {
  const runtimeEnv = getCloudflareRuntimeEnv();
  const processUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const processAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const runtimeUrl = runtimeEnv?.NEXT_PUBLIC_SUPABASE_URL;
  const runtimeAnon = runtimeEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = processUrl || runtimeUrl;
  const anonKey = processAnon || runtimeAnon;

  return {
    url,
    anonKey,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY
  };
}

export function getSupabaseEnvDiagnostics() {
  const runtimeEnv = getCloudflareRuntimeEnv();
  const processUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const processAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const runtimeUrl = runtimeEnv?.NEXT_PUBLIC_SUPABASE_URL;
  const runtimeAnon = runtimeEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const env = getSupabaseEnv();
  const source = getSource(processUrl, processAnon, runtimeUrl, runtimeAnon);

  return {
    processUrl: !!processUrl,
    processAnon: !!processAnon,
    cloudflareContext: !!getCloudflareRequestContext(),
    requestContext: !!runtimeEnv,
    source,
    hasUrl: !!env.url,
    hasAnon: !!env.anonKey,
    createSupabaseServerClient: {
      source,
      hasUrl: !!env.url,
      hasAnon: !!env.anonKey
    }
  };
}

export function isSupabaseEnvDebugAllowed() {
  const runtimeEnv = getCloudflareRuntimeEnv();
  const branch = process.env.CF_PAGES_BRANCH || runtimeEnv?.CF_PAGES_BRANCH;
  return process.env.NODE_ENV !== "production" || Boolean(branch && branch !== "main");
}
