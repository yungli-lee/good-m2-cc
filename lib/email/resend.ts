import { formatSender, getEmailConfig } from "./config";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
};

type SendEmailResult = {
  ok: boolean;
  id?: string;
  status?: number;
  safeMessage?: string;
  errorCode?: string;
};

function safeMessageFromBody(value: unknown) {
  if (!value || typeof value !== "object") return "Resend request failed";
  const body = value as Record<string, unknown>;
  const message = typeof body.message === "string" ? body.message : "Resend request failed";
  const name = typeof body.name === "string" ? body.name : null;
  return `${name ? `${name}: ` : ""}${message}`.slice(0, 220);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = getEmailConfig();
  const from = formatSender(config);

  if (!config.apiKey || !from) {
    return {
      ok: false,
      errorCode: "missing_email_config",
      safeMessage: `Missing email config: ${config.missing.join(", ") || "unknown"}`
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo || undefined
      })
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        errorCode: typeof body?.name === "string" ? body.name : "resend_error",
        safeMessage: safeMessageFromBody(body)
      };
    }

    return {
      ok: true,
      status: response.status,
      id: typeof body?.id === "string" ? body.id : undefined
    };
  } catch {
    return {
      ok: false,
      errorCode: "network_error",
      safeMessage: "Unable to reach Resend"
    };
  }
}
