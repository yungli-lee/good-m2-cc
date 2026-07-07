export type EmailConfig = {
  provider: "Resend";
  apiKey: string | null;
  hasApiKey: boolean;
  fromEmail: string | null;
  fromName: string;
  notifyEmail: string | null;
  siteUrl: string | null;
  missing: string[];
};

function envValue(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

export function getEmailConfig(): EmailConfig {
  const apiKey = envValue("RESEND_API_KEY");
  const fromEmail = envValue("RESEND_FROM_EMAIL") || envValue("CONTACT_FROM_EMAIL");
  const notifyEmail = envValue("INQUIRY_NOTIFY_EMAIL") || envValue("CONTACT_NOTIFY_TO");
  const fromName = envValue("CONTACT_FROM_NAME") || "阿勇不動產顧問";
  const siteUrl = envValue("NEXT_PUBLIC_SITE_URL");
  const missing: string[] = [];

  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!fromEmail) missing.push("RESEND_FROM_EMAIL 或 CONTACT_FROM_EMAIL");
  if (!notifyEmail) missing.push("INQUIRY_NOTIFY_EMAIL 或 CONTACT_NOTIFY_TO");

  return {
    provider: "Resend",
    apiKey,
    hasApiKey: Boolean(apiKey),
    fromEmail,
    fromName,
    notifyEmail,
    siteUrl,
    missing
  };
}

export function formatSender(config: Pick<EmailConfig, "fromEmail" | "fromName">) {
  if (!config.fromEmail) return null;
  return config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail;
}

export function publicEmailConfig() {
  const config = getEmailConfig();
  return {
    provider: config.provider,
    hasApiKey: config.hasApiKey,
    fromEmail: config.fromEmail,
    notifyEmail: config.notifyEmail,
    siteUrl: config.siteUrl,
    missing: config.missing
  };
}
