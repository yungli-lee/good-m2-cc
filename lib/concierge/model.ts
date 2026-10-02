import "server-only";
import { getRequestContext } from "@/lib/supabase/env";
export function conciergeEnv() {
  const env = getRequestContext()?.env as Record<string, string | undefined> | undefined;
  const key = (process.env.OPENAI_API_KEY || env?.OPENAI_API_KEY || "").trim();
  const model = (process.env.CONCIERGE_AI_MODEL || env?.CONCIERGE_AI_MODEL || "gpt-4.1-mini-2025-04-14").trim();
  return { key, model: /^[a-zA-Z0-9.-]{1,80}$/.test(model) ? model : "gpt-4.1-mini-2025-04-14" };
}
export async function modelJson(instructions: string, input: unknown) {
  const { key, model } = conciergeEnv();
  if (!key) throw new Error("missing_model");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, store: false, instructions, input: `請依指示輸出 JSON。以下為需求資料：\n${JSON.stringify(input)}`, max_output_tokens: 900,
      text: { format: { type: "json_object" } } })
  });
  if (!response.ok) {
    // Only log known provider codes, never its message, request content or credentials.
    const failure = await response.json().catch(() => null);
    const known = ["insufficient_quota", "invalid_api_key", "rate_limit_exceeded", "model_not_found", "permission_denied", "invalid_request_error"];
    const candidate = failure?.error?.code || failure?.error?.type;
    const code = known.includes(candidate) ? candidate : "unknown";
    console.warn("concierge_model_http", { status: response.status, code });
    throw new Error("model_unavailable");
  }
  const data = await response.json();
  if (data.status !== "completed") throw new Error("model_incomplete");
  const text = (data.output || []).flatMap((item: { content?: Array<{ type: string; text?: string }> }) => item.content || [])
    .filter((part: { type: string }) => part.type === "output_text").map((part: { text: string }) => part.text).join("");
  if (!text || text.length > 6000) throw new Error("model_output_invalid");
  return JSON.parse(text);
}
