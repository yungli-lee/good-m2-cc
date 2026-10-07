export const PACIFIC_PHOTO_LIMIT = 20;
export const PACIFIC_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export function normalizePacificPhotoUrl(value: unknown) {
  if (typeof value !== "string") throw new Error("照片網址格式不正確");
  const url = new URL(value);
  const allowed = (url.hostname === "hq.houseol.com.tw" && url.pathname.startsWith("/images/pictures/")) ||
    (url.hostname === "prms.pacific.com.tw" && url.pathname.startsWith("/Uploads/Object/")) ||
    (url.hostname === "www.pacific.com.tw" && url.pathname.startsWith("/Uploads/Object/"));
  if (url.protocol !== "https:" || url.port || url.username || url.password || !allowed ||
      !/\.(?:jpe?g|png|webp)$/i.test(url.pathname)) throw new Error("不支援這個照片來源");
  url.hash = "";
  return url.toString();
}
export function parsePacificPhotos(data: unknown, saleId: string) {
  if (!Array.isArray(data)) throw new Error("太平洋照片清單格式不正確");
  const seen = new Set<string>();
  const photos: Array<{ url: string; name: string; label: string }> = [];
  for (const entry of data) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    if (String(item.saleID).toUpperCase() !== saleId.toUpperCase() || ![1, 5].includes(Number(item.type))) continue;
    let url: string;
    try { url = normalizePacificPhotoUrl(item.sysFileName); } catch { continue; }
    if (seen.has(url)) continue;
    seen.add(url);
    const extension = new URL(url).pathname.split(".").pop()!.toLowerCase();
    photos.push({ url, name: "pacific-" + saleId.toLowerCase() + "-" + (photos.length + 1) + "." + extension,
      label: Number(item.type) === 5 ? "格局圖" : "現場照片" });
    if (photos.length >= PACIFIC_PHOTO_LIMIT) break;
  }
  return photos.sort((a, b) => Number(a.label === "格局圖") - Number(b.label === "格局圖"));
}
export async function readPacificPhoto(response: Response) {
  if (!response.ok || !response.body) throw new Error("照片下載失敗");
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!type || !["image/jpeg", "image/png", "image/webp"].includes(type)) throw new Error("照片格式不支援");
  if (Number(response.headers.get("content-length")) > PACIFIC_PHOTO_MAX_BYTES) throw new Error("照片超過 5MB");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > PACIFIC_PHOTO_MAX_BYTES) throw new Error("照片超過 5MB");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  if (!size) throw new Error("照片內容為空");
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v);
  const webp = String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  if (!(type === "image/jpeg" && jpeg || type === "image/png" && png || type === "image/webp" && webp)) throw new Error("照片內容與格式不符");
  return { bytes, type };
}
