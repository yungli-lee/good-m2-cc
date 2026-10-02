import { verifyReply } from "@/lib/concierge/audio-token";
import { takeConciergeSlot } from "@/lib/concierge/limit";
import { getGuideSpeechEnv } from "@/lib/properties/guide-speech-env";
import { guideSsml } from "@/lib/properties/guide-speech";
export const runtime = "edge";
export const dynamic = "force-dynamic";
const error = (status: number) => Response.json({ error: "語音暫時無法播放，請閱讀文字回答" }, { status });
type EdgeCache = { match(r: Request): Promise<Response | undefined>; put(r: Request, v: Response): Promise<void> };
export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return error(403);
  const release = takeConciergeSlot(request.headers.get("cf-connecting-ip") || "unknown");
  if (!release) return error(429);
  try {
    const raw = await request.text();
    if (raw.length > 10000) return error(413);
    const env = getGuideSpeechEnv();
    if (!env.enabled) return error(503);
    const reply = await verifyReply(JSON.parse(raw).token || "", env.key);
    if (!reply) return error(400);
    const ssml = guideSsml(reply.text, reply.role);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ssml)))).map(b => b.toString(16).padStart(2, "0")).join("");
    const cache = (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default;
    const cacheKey = new Request(`${new URL(request.url).origin}/api/public/concierge/audio/cache/${hash}`);
    const cached = await cache?.match(cacheKey);
    if (cached) return new Response(cached.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
    const upstream = await fetch(`https://${env.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST", signal: AbortSignal.timeout(15000), headers: { "Ocp-Apim-Subscription-Key": env.key,
        "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3" }, body: ssml
    });
    if (!upstream.ok) return error(502);
    const bytes = await upstream.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 2000000) return error(502);
    const result = new Response(bytes, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=600" } });
    try { await cache?.put(cacheKey, result.clone()); } catch { /* no-cache playback works */ }
    result.headers.set("Cache-Control", "no-store");
    return result;
  } catch { return error(502); }
  finally { release(); }
}
