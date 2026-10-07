import { requireApiRole, apiError } from "@/lib/auth-api";
import { normalizePacificPhotoUrl, readPacificPhoto } from "@/lib/properties/pacific-photos";
export const runtime = "edge";
export async function POST(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  let url: string;
  try { url = normalizePacificPhotoUrl(body?.url); }
  catch { return apiError("不支援這個照片來源", 422); }
  try {
    // Never forward authorization or user cookies to the photo host.
    const response = await fetch(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(15000) });
    const { bytes, type } = await readPacificPhoto(response);
    return new Response(bytes, { headers: { "content-type": type, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch (error) { return apiError(error instanceof Error ? error.message : "照片下載失敗", 502); }
}
