import { getPublishedPropertyBySlug } from "@/lib/properties/queries";
import { buildPropertyGuide, type GuideRole, type GuideTopic } from "@/lib/properties/character-guide";
import { guideSsml } from "@/lib/properties/guide-speech";
import { getGuideSpeechEnv } from "@/lib/properties/guide-speech-env";
import { propertyTypeLabel } from "@/lib/format";
import type { Property } from "@/lib/properties/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";
const pending = new Map<string, Promise<Response>>();
type EdgeCache = { match(request: Request): Promise<Response | undefined>; put(request: Request, response: Response): Promise<void> };
function error(status: number) { return Response.json({ error: "語音暫時無法使用，請選擇備選語音。" }, { status, headers: { "Cache-Control": "no-store" } }); }

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") || "";
  const role = url.searchParams.get("role");
  const topic = url.searchParams.get("topic");
  // Accept only existing public property scripts, never arbitrary text or voice names.
  if (!slug || slug.length > 200 || !["ayong", "amei"].includes(role || "") || !["overview", "details", "highlights"].includes(topic || "")) return error(400);
  const env = getGuideSpeechEnv();
  if (!env.enabled) return error(503);
  try {
    const result = await getPublishedPropertyBySlug(slug);
    if (result.error) return error(502);
    if (!result.data) return error(404);
    const property = result.data as unknown as Property;
    const typeLabel = property.property_type === "apartment" ? "無電梯公寓" : property.property_type === "building" && property.building_subtype === "huaxia" ? "華廈" : propertyTypeLabel(property.property_type);
    const text = buildPropertyGuide(property, typeLabel)[role as GuideRole][topic as GuideTopic];
    if (text.length > 2000) return error(400);
    const ssml = guideSsml(text, role as GuideRole);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ssml)))).map(byte => byte.toString(16).padStart(2, "0")).join("");
    // Key by content so CMS edits immediately select new audio. Recheck publication
    // before every lookup so withdrawn listings cannot reuse cached introductions.
    const cacheRequest = new Request(`${url.origin}/api/public/property-guide-audio/cache/${hash}`);
    const edgeCache = (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default;
    const cached = await edgeCache?.match(cacheRequest);
    if (cached) return new Response(cached.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
    let operation = pending.get(hash);
    if (!operation) {
      if (pending.size >= 8) return error(429);
      operation = (async () => {
        const upstream = await fetch(`https://${env.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
          method: "POST", signal: AbortSignal.timeout(15000),
          headers: { "Ocp-Apim-Subscription-Key": env.key, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3", "User-Agent": "YongMeiPropertyGuide" }, body: ssml
        });
        if (!upstream.ok) return error(upstream.status === 429 ? 429 : 502);
        const bytes = await upstream.arrayBuffer();
        if (!bytes.byteLength || bytes.byteLength > 2000000) return error(502);
        const audio = new Response(bytes, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=604800" } });
        if (edgeCache) { try { await edgeCache.put(cacheRequest, audio.clone()); } catch { /* Audio still works without edge cache. */ } }
        return audio;
      })();
      pending.set(hash, operation);
      void operation.finally(() => pending.delete(hash)).catch(() => {});
    }
    const audio = (await operation).clone();
    audio.headers.set("Cache-Control", "no-store");
    return audio;
  } catch { return error(502); }
}
