type CloudflareRuntimeEnv = Partial<{
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CF_PAGES_BRANCH: string;
}>;

type CloudflareRequestContext = {
  env?: CloudflareRuntimeEnv;
};

export function getRequestContext() {
  const contextSymbol = Symbol.for("__cloudflare-request-context__");
  const globalWithContext = globalThis as unknown as {
    [key: symbol]: CloudflareRequestContext | undefined;
  };
  return globalWithContext[contextSymbol];
}

function getCloudflareRuntimeEnv() {
  const { env } = getRequestContext() || {};
  return env;
}

function cleanEnv(value?: string) {
  return value && value.trim() ? value.trim() : undefined;
}

function getSource(processUrl?: string, processAnon?: string, runtimeUrl?: string, runtimeAnon?: string) {
  if (processUrl && processAnon) return "process";
  if (runtimeUrl && runtimeAnon) return "cloudflare";
  return "missing";
}

export function getSupabaseEnv() {
  const { env: runtimeEnv } = getRequestContext() || {};
  const processUrl = cleanEnv(process.env.SUPABASE_URL) || cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const processAnon = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const runtimeUrl = cleanEnv(runtimeEnv?.SUPABASE_URL) || cleanEnv(runtimeEnv?.NEXT_PUBLIC_SUPABASE_URL);
  const runtimeAnon = cleanEnv(runtimeEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const url = processUrl || runtimeUrl;
  const anonKey = processAnon || runtimeAnon;

  return {
    url,
    anonKey,
    serviceRoleKey: cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnv(runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY)
  };
}

export function getSupabaseEnvDiagnostics() {
  const requestContext = getRequestContext();
  const { env: runtimeEnv } = requestContext || {};
  const processUrl = cleanEnv(process.env.SUPABASE_URL) || cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const processAnon = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const processServiceRole = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const runtimeUrl = cleanEnv(runtimeEnv?.SUPABASE_URL) || cleanEnv(runtimeEnv?.NEXT_PUBLIC_SUPABASE_URL);
  const runtimeAnon = cleanEnv(runtimeEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const runtimeServiceRole = cleanEnv(runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY);
  const env = getSupabaseEnv();
  const source = getSource(processUrl, processAnon, runtimeUrl, runtimeAnon);

  return {
    processUrl: !!processUrl,
    processAnon: !!processAnon,
    cloudflareContext: !!requestContext,
    requestContext: !!runtimeEnv,
    envKeys: Object.keys(runtimeEnv || {}).sort(),
    source,
    hasUrl: !!env.url,
    hasAnon: !!env.anonKey,
    hasServiceRole: !!env.serviceRoleKey,
    createSupabaseServerClient: {
      source,
      hasUrl: !!env.url,
      hasAnon: !!env.anonKey
    },
    createSupabaseAdminClient: {
      source: processUrl && processServiceRole ? "process" : runtimeUrl && runtimeServiceRole ? "cloudflare" : "missing",
      hasUrl: !!env.url,
      hasServiceRole: !!env.serviceRoleKey
    }
  };
}

export function isSupabaseEnvDebugAllowed() {
  const runtimeEnv = getCloudflareRuntimeEnv();
  const branch = process.env.CF_PAGES_BRANCH || runtimeEnv?.CF_PAGES_BRANCH;
  return process.env.NODE_ENV !== "production" || Boolean(branch && branch !== "main");
}
