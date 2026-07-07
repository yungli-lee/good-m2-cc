import { getEmailConfig } from "./config";
import { sendEmail } from "./resend";

export async function sendDiagnosticsEmail(actorEmail: string | null) {
  const config = getEmailConfig();
  if (!config.notifyEmail) {
    return {
      ok: false,
      errorCode: "missing_notify_email",
      safeMessage: "Missing email config: INQUIRY_NOTIFY_EMAIL 或 CONTACT_NOTIFY_TO"
    };
  }

  const now = new Date().toISOString();
  return sendEmail({
    to: config.notifyEmail,
    subject: "Email Diagnostics 測試信",
    html: `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#102343;">
        <h1 style="font-size:20px;margin:0 0 16px;">Email Diagnostics 測試信</h1>
        <p>這封信代表 Resend 設定可正常寄送。</p>
        <p>操作者：${actorEmail || "-"}</p>
        <p>時間：${now}</p>
      </div>
    `,
    text: `Email Diagnostics 測試信\n\n這封信代表 Resend 設定可正常寄送。\n操作者: ${actorEmail || "-"}\n時間: ${now}`
  });
}
