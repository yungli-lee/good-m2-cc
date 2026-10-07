import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { extractPacificPropertyText, normalizePacificPropertyUrl } from "@/lib/properties/pacific-import";

export const runtime = "edge";

export async function POST(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  const inputUrl = typeof body?.url === "string" ? body.url : "";

  let sourceUrl: string;
  try {
    sourceUrl = normalizePacificPropertyUrl(inputUrl);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "無效網址", 422);
  }

  let response: Response;
  try {
    response = await fetch(sourceUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 (compatible; GoodM2PropertyImporter/1.0)"
      },
      redirect: "follow",
      cache: "no-store"
    });
  } catch {
    return apiError("無法連線到太平洋房屋，請稍後再試", 502);
  }

  if (!response.ok) {
    return apiError(`太平洋房屋回應異常（HTTP ${response.status}）`, 502);
  }

  const html = await response.text();
  if (!html.trim()) return apiError("太平洋房屋頁面沒有可讀內容", 502);

  const rawText = extractPacificPropertyText(html, sourceUrl);
  if (!rawText.trim()) return apiError("無法解析這個物件頁面", 422);

  return NextResponse.json({ data: { sourceUrl, rawText } });
}
