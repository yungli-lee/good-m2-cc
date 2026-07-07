import { requireRole } from "@/lib/auth";
import { publicEmailConfig } from "@/lib/email/config";
import { sendTestEmailAction } from "./actions";

export const runtime = "edge";

type Props = {
  searchParams: Promise<{
    sent?: string;
    error?: string;
    message?: string;
  }>;
};

function StatusPill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`admin-users-badge ${ok ? "is-active" : "is-disabled"}`}>
      {children}
    </span>
  );
}

export default async function EmailDiagnosticsPage({ searchParams }: Props) {
  await requireRole(["admin", "owner"]);
  const params = await searchParams;
  const config = publicEmailConfig();

  return (
    <main className="section">
      <div className="container">
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0 }}>Email Diagnostics</h1>
            <p className="muted">檢查 Resend 通知信設定，API Key 僅顯示是否已設定。</p>
          </div>
        </div>

        {params.sent ? (
          <div className="card" style={{ marginBottom: 18, borderColor: "#b9e2ca" }}>
            <div className="card-body">測試信已送出，並已寫入稽核紀錄。</div>
          </div>
        ) : null}
        {params.error ? (
          <div className="card" style={{ marginBottom: 18, borderColor: "#efb8b8" }}>
            <div className="card-body">測試信送出失敗：{params.message || params.error}</div>
          </div>
        ) : null}

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-body">
            <h2 style={{ marginTop: 0 }}>目前設定</h2>
            <div className="table-wrap">
              <table className="admin-table">
                <tbody>
                  <tr>
                    <th>Provider</th>
                    <td>{config.provider}</td>
                  </tr>
                  <tr>
                    <th>From email</th>
                    <td>{config.fromEmail || <span className="muted">未設定</span>}</td>
                  </tr>
                  <tr>
                    <th>Notify email</th>
                    <td>{config.notifyEmail || <span className="muted">未設定</span>}</td>
                  </tr>
                  <tr>
                    <th>RESEND_API_KEY</th>
                    <td><StatusPill ok={config.hasApiKey}>{config.hasApiKey ? "已設定" : "未設定"}</StatusPill></td>
                  </tr>
                  <tr>
                    <th>Site URL</th>
                    <td>{config.siteUrl || <span className="muted">未設定</span>}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {config.missing.length ? (
              <div className="card" style={{ marginTop: 18, borderColor: "#e6d49a" }}>
                <div className="card-body">缺少設定：{config.missing.join("、")}</div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 style={{ marginTop: 0 }}>Send test email</h2>
            <p className="muted">測試信會寄到 Notify email，成功或失敗都會寫入稽核紀錄。</p>
            <form action={sendTestEmailAction}>
              <button className="button" type="submit" disabled={!config.hasApiKey || !config.fromEmail || !config.notifyEmail}>
                寄送測試信
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
