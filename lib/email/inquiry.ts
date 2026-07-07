import { getEmailConfig } from "./config";
import { sendEmail } from "./resend";

type InquiryEmailInput = {
  id: string;
  formType: string;
  name: string;
  phone: string;
  email?: string | null;
  message: string;
  propertyId?: string | null;
  sourcePage?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendInquiryNotification(input: InquiryEmailInput) {
  const config = getEmailConfig();
  if (!config.notifyEmail) {
    return {
      ok: false,
      errorCode: "missing_notify_email",
      safeMessage: "Missing email config: INQUIRY_NOTIFY_EMAIL 或 CONTACT_NOTIFY_TO"
    };
  }

  const adminUrl = config.siteUrl ? `${config.siteUrl.replace(/\/$/, "")}/admin/inquiries/${input.id}` : null;
  const rows = [
    ["姓名", input.name],
    ["電話", input.phone],
    ["Email", input.email || "-"],
    ["表單類型", input.formType],
    ["來源頁", input.sourcePage || "-"],
    ["物件 ID", input.propertyId || "-"],
    ["後台連結", adminUrl || "-"]
  ];
  const htmlRows = rows.map(([label, value]) => `<tr><th align="left" style="padding:6px 12px 6px 0;">${escapeHtml(label)}</th><td style="padding:6px 0;">${escapeHtml(value)}</td></tr>`).join("");
  const textRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n");

  return sendEmail({
    to: config.notifyEmail,
    subject: `新的客戶詢問單：${input.name}`,
    replyTo: input.email || null,
    html: `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#102343;">
        <h1 style="font-size:20px;margin:0 0 16px;">新的客戶詢問單</h1>
        <table style="border-collapse:collapse;margin-bottom:16px;">${htmlRows}</table>
        <h2 style="font-size:16px;margin:18px 0 8px;">需求內容</h2>
        <p style="white-space:pre-wrap;margin:0;">${escapeHtml(input.message)}</p>
      </div>
    `,
    text: `新的客戶詢問單\n\n${textRows}\n\n需求內容:\n${input.message}`
  });
}
