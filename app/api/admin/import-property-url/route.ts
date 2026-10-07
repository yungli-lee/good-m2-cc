import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { parsePacificProperty, normalizePacificPropertyUrl } from "@/lib/properties/pacific-import";

import { parsePacificPhotos } from "@/lib/properties/pacific-photos";

export const runtime = "edge";

export async function POST(request: Request) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  let sourceUrl: string;
  try { sourceUrl = normalizePacificPropertyUrl(typeof body?.url === "string" ? body.url : ""); }
  catch (error) { return apiError(error instanceof Error ? error.message : "無效網址", 422); }
  const id = new URL(sourceUrl).searchParams.get("saleID")!;
  try {
    // This is the same public data endpoint and public authorization used by Pacific's page.
    const response = await fetch("https://www.pacific.com.tw/api/ObjectAPI/GetObjectDetail/" + encodeURIComponent(id), {
      headers: { accept: "application/json", authorization: "Basic cHJtczpwcm1z" },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15000)
    });
    if (response.status >= 300 && response.status < 400) return apiError("太平洋房屋資料 API 發生轉址，未匯入任何欄位", 502);
    if (!response.ok) return apiError("太平洋房屋物件資料回應異常（HTTP " + response.status + "）", 502);
    const data: unknown = await response.json();
    const { rawText, parsed } = parsePacificProperty(data, sourceUrl);
    let photos: ReturnType<typeof parsePacificPhotos> = [];
    let photoWarning = "";
    try {
      const pictures = await fetch("https://www.pacific.com.tw/api/ObjectAPI/GetObjectPicture/" + encodeURIComponent(id), {
        headers: { accept: "application/json", authorization: "Basic cHJtczpwcm1z" },
        redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(15000)
      });
      if (!pictures.ok) throw new Error("照片清單暫時無法讀取");
      photos = parsePacificPhotos(await pictures.json(), id);
      if (!photos.length) photoWarning = "沒有取得可匯入的照片，文字欄位已填入。";
    } catch { photoWarning = "照片清單暫時無法讀取，文字欄位已填入，可稍後重試。"; }
    return NextResponse.json({ data: { sourceUrl, rawText, parsed, photos, photoWarning } });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "無法讀取太平洋房屋物件資料，請稍後再試", 502);
  }
}
