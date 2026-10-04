import { getLineMessagingConfig } from "./config.ts";

export type LinePushResult = {
  ok: boolean;
  status?: number;
  recipientCount?: number;
  sentCount?: number;
  errorCode?: string;
  safeMessage?: string;
};

function safeErrorBody(value: unknown) {
  if (!value || typeof value !== "object") return "LINE Messaging API request failed";
  const body = value as Record<string, unknown>;
  const message = typeof body.message === "string" ? body.message : "LINE Messaging API request failed";
  return message.slice(0, 220);
}

export async function pushLineText(text: string): Promise<LinePushResult> {
  const config = getLineMessagingConfig();
  if (!config.channelAccessToken || !config.recipientIds.length) {
    return {
      ok: false,
      errorCode: "missing_line_config",
      safeMessage: `Missing LINE config: ${config.missing.join(", ") || "unknown"}`
    };
  }

  let sentCount = 0;
  let lastStatus: number | undefined;
  let lastError: string | undefined;

  for (const to of config.recipientIds) {
    try {
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.channelAccessToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          to,
          messages: [{ type: "text", text: text.slice(0, 5000) }]
        })
      });
      lastStatus = response.status;

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        lastError = safeErrorBody(body);
        continue;
      }

      sentCount += 1;
    } catch {
      lastError = "Unable to reach LINE Messaging API";
    }
  }

  return {
    ok: sentCount === config.recipientIds.length,
    status: lastStatus,
    recipientCount: config.recipientIds.length,
    sentCount,
    ...(sentCount === config.recipientIds.length ? {} : {
      errorCode: sentCount ? "partial_line_send_failed" : "line_send_failed",
      safeMessage: lastError || "LINE notification send failed"
    })
  };
}
