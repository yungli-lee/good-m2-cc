import { notFound } from "next/navigation";
import { getSupabaseEnvDiagnostics, isSupabaseEnvDebugAllowed } from "@/lib/supabase/env";

export const runtime = "edge";

export default function AdminEnvDebugPage() {
  if (!isSupabaseEnvDebugAllowed()) notFound();

  const diagnostics = getSupabaseEnvDiagnostics();

  return (
    <main className="section">
      <div className="container">
        <h1>Supabase Env Debug</h1>
        <pre className="card" style={{ padding: 16, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(diagnostics, null, 2)}
        </pre>
      </div>
    </main>
  );
}
