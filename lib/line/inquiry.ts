import { getLineMessagingConfig } from "./config.ts";
import { pushLineText } from "./messaging.ts";

export type InquiryLineInput = {
  id: string;
  formType: string;
  name: string;
  phone: string;
  email?: string | null;
  message: string;
  propertyId?: string | null;
  propertyTitle?: string | null;
  propertySlug?: string | null;
  sourcePage?: string | null;
};

export function formatInquiryLineMessage(input: InquiryLineInput) {
  const config = getLineMessagingConfig();
  const adminUrl = config.siteUrl
    ? `${config.siteUrl.replace(/\/$/, "")}/admin/inquiries/${input.id}`
    : null;
  const property = input.propertyTitle
    ? `${input.propertyTitle}${input.propertySlug ? `（${input.propertySlug}）` : ""}`
    : input.propertyId || "-";

  const lines = [
    "🔔 網站新詢問",
    `姓名：${input.name}`,
    `電話：${input.phone}`,
    `Email：${input.email || "-"}`,
    `物件：${property}`,
    `來源：${input.sourcePage || input.formType}`,
    "",
    "留言：",
    input.message
  ];
  if (adminUrl) lines.push("", `後台：${adminUrl}`);
  return lines.join("\n").slice(0, 5000);
}

export async function sendInquiryLineNotification(input: InquiryLineInput) {
  return pushLineText(formatInquiryLineMessage(input));
}
