import "server-only";
import { getRequestContext } from "@/lib/supabase/env";

export function getGuideSpeechEnv() {
  const env = getRequestContext()?.env as Record<string, string | undefined> | undefined;
  const key = (process.env.AZURE_SPEECH_KEY || env?.AZURE_SPEECH_KEY || "").trim();
  const region = (process.env.AZURE_SPEECH_REGION || env?.AZURE_SPEECH_REGION || "").trim();
  return { key, region, enabled: Boolean(key && /^[a-z0-9]+$/.test(region)) };
}
