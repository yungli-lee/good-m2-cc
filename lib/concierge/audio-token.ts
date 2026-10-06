export type SpokenReply = { text: string; role: "amei" | "ayong"; expires: number };
async function keyFor(secret: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(`concierge-audio-v1:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function signReply(reply: SpokenReply, secret: string) {
  const payload = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(reply))));
  const signature = await crypto.subtle.sign("HMAC", await keyFor(secret), new TextEncoder().encode(payload));
  return `${payload}.${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("")}`;
}
export async function verifyReply(token: string, secret: string, now = Date.now()): Promise<SpokenReply | null> {
  try {
    if (token.length > 9000) return null;
    const [payload, hex, extra] = token.split(".");
    if (extra || !/^[a-f0-9]{64}$/.test(hex || "")) return null;
    const bytes = Uint8Array.from(hex.match(/../g)!, s => parseInt(s, 16));
    if (!await crypto.subtle.verify("HMAC", await keyFor(secret), bytes, new TextEncoder().encode(payload))) return null;
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), c => c.charCodeAt(0))));
    if (!["amei", "ayong"].includes(data.role) || typeof data.text !== "string" || !data.text || data.text.length > 1200 || !Number.isFinite(data.expires) || data.expires < now || data.expires > now + 600000) return null;
    return data;
  } catch { return null; }
}
