import crypto from "node:crypto";
import { headers } from "next/headers";

export async function getRequestMeta() {
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const userAgent = h.get("user-agent") || "";
  return { ipHash: hashIp(ip), userAgent };
}

export function hashIp(ip: string) {
  const secret = process.env.IP_HASH_SECRET || "development-only-change-me";
  return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}
