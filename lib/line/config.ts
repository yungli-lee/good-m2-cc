import { getRequestContext } from "@/lib/supabase/env";

export type LineMessagingConfig = {
  channelAccessToken: string | null;
  recipientIds: string[];
  siteUrl: string | null;
  missing: string[];
};

function envValue(name: string) {
  const env = getRequestContext()?.env as Record<string, string | undefined> | undefined;
  const value = process.env[name] || env?.[name];
  return value && value.trim() ? value.trim() : null;
}

export function getLineMessagingConfig(): LineMessagingConfig {
  const channelAccessToken = envValue("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN");
  const recipientsRaw =
    envValue("LINE_MESSAGING_RECIPIENT_IDS") ||
    envValue("LINE_MESSAGING_RECIPIENT_ID") ||
    "";
  const recipientIds = [...new Set(recipientsRaw.split(",").map(value => value.trim()).filter(Boolean))];
  const siteUrl = envValue("NEXT_PUBLIC_SITE_URL");
  const missing: string[] = [];

  if (!channelAccessToken) missing.push("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN");
  if (!recipientIds.length) missing.push("LINE_MESSAGING_RECIPIENT_ID(S)");

  return { channelAccessToken, recipientIds, siteUrl, missing };
}
