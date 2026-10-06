// Only the public Pacific listing page and its published image hosts are fetched.
export class PacificImportError extends Error {}
export const PACIFIC_IMAGE_LIMIT = 20;
const site = "https://www.pacific.com.tw";
export function parsePacificUrl(input: string) {
  let url: URL;
  try { url = new URL(input); } catch { throw new PacificImportError("請貼上完整的太平洋物件網址。"); }
  if (url.protocol !== "https:" || !["www.pacific.com.tw", "pacific.com.tw"].includes(url.hostname) || url.port || url.username || url.password || !/^\/Object\/(?:ObjectDetail|RentDetail|ObjectRentDetail)\/?$/i.test(url.pathname)) {
    throw new PacificImportError("只支援太平洋房屋的物件詳細頁網址。");
  }
  const saleId = url.searchParams.get("saleID")?.toUpperCase() || "";
  if (!/^[A-Z]\d{5,12}$/.test(saleId)) throw new PacificImportError("網址缺少有效的 saleID 物件編號。");
  const path = /rent/i.test(url.pathname) ? "ObjectRentDetail" : "ObjectDetail";
  return { saleId, sourceUrl: `${site}/Object/${path}/?saleID=${saleId}`, slug: `pacific-${saleId.toLowerCase()}` };
}
export function sourceMarker(saleId: string) { return `太平洋來源：${saleId}`; }
export async function boundedFetch(url: string, maxBytes: number, headers: Record<string, string> = {}, fetcher: typeof fetch = fetch) {
  const response = await fetcher(url, { headers, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.body) throw new PacificImportError("來源網站暫時無法讀取，請稍後重試。");
  if (Number(response.headers.get("content-length")) > maxBytes) throw new PacificImportError("來源檔案超過匯入大小上限。");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new PacificImportError("來源檔案超過匯入大小上限。");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return { bytes, contentType: response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "" };
}
function text(value: unknown, limit = 500) {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) : "";
}
function number(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
export function mapPacificProperty(raw: Record<string, unknown>, source: ReturnType<typeof parsePacificUrl>) {
  if (text(raw.saleID).toUpperCase() !== source.saleId || !text(raw.objectName) || !(Number(raw.idx) > 0) || Number(raw.objectStatus) !== 1) throw new PacificImportError("來源物件不存在或目前未公開上架。");
  const title = text(raw.objectName, 120);
  const kind = text(raw.attributName);
  const propertyType = /華廈|大樓/.test(kind) ? "building" : /公寓/.test(kind) ? "apartment" : /農舍/.test(kind) ? "farmhouse" : /透天|別墅/.test(kind) ? "townhouse" : /農地/.test(kind) ? "farmland" : /建地/.test(kind) ? "building_land" : /土地/.test(kind) ? "land" : /廠房/.test(kind) ? "factory" : /店面/.test(kind) ? "storefront" : "other";
  const transaction = Number(raw.hasSellAndRent) === 2 ? "rent" : "sale";
  const ageText = text(raw.objectAge);
  const years = ageText.match(/(\d+)年/); const months = ageText.match(/(\d+)個?月/);
  const age = years || months ? Math.round((Number(years?.[1] || 0) + Number(months?.[1] || 0) / 12) * 100) / 100 : undefined;
  const floors = number(raw.buildingAboveFloor);
  const feature = text(raw.objFeature1, 6000);
  const school = text(raw.school1, 160);
  const parking = text(raw.stallTypeName, 80);
  const warnings = ["委託期限、底價與屋主資料請自行補填。", "學區、車位權利與坪數請依正式文件確認。", "屋齡為來源網站匯入當下數值。"];
  return {
    title, slug: source.slug, address_public: text(raw.address, 160), city: text(raw.cityName, 80), district: text(raw.areaName, 80),
    address_private: `${sourceMarker(source.saleId)}\n來源網址：${source.sourceUrl}\n來源店：${text(raw.storeName, 100)}\n原刊登業務：${text(raw.saleEmployeeName, 80)}\n匯入日期：${new Date().toISOString().slice(0, 10)}\n${warnings.join("\n")}`,
    property_type: propertyType, building_subtype: /華廈/.test(kind) ? "huaxia" : /大樓/.test(kind) ? "highrise" : "",
    transaction_type: transaction, price: transaction === "sale" ? number(raw.sellTotalPrice) : undefined, rent_monthly: transaction === "rent" ? number(raw.sellTotalPrice) : undefined,
    land_area_ping: number(raw.landArea), building_area_ping: number(raw.totalArea), main_building_area_ping: number(raw.mainBuildArea), auxiliary_building_area_ping: number(raw.outbuildingArea), shared_area_ping: number(raw.pubFacilityArea),
    layout: [raw.layoutRoom, raw.layoutHall, raw.layoutToilet].every(v => number(v) !== undefined) ? `${number(raw.layoutRoom)}房${number(raw.layoutHall)}廳${number(raw.layoutToilet)}衛` : "",
    age, orientation: text(raw.directionName, 40), floor: `${text(String(raw.onWhichFloor || ""), 20)}${floors ? `樓／共${floors}樓` : ""}`, above_ground_floors: floors,
    management_fee: number(raw.adminFee), management_fee_payment: ["月繳", "雙月繳", "季繳", "年繳", "一次繳"].includes(text(raw.payAdminFeeTypeName)) ? text(raw.payAdminFeeTypeName) : "",
    community_name: text(raw.community, 200), units_per_floor: number(raw.totalDoorPerFloor), elevator_count: number(raw.elevatorPerFloor),
    parking_type: /平面/.test(parking) ? ["平面車位"] : /機械/.test(parking) ? ["機械車位"] : [],
    current_condition_type: text(raw.useStatusName) === "空屋" ? ["空屋"] : [],
    highlights: [parking && `車位：${parking}`, school && `鄰近學校：${school}`].filter(Boolean).join("\n"),
    description: [feature, school && `來源列示鄰近學校：${school}（實際學區請確認）`, parking && `來源列示車位：${parking}（權利與坪數請確認）`].filter(Boolean).join("\n\n"),
    sale_motivation: [], status: "draft", is_featured: false
  };
}
export function safePacificImageUrl(input: unknown) {
  if (typeof input !== "string") return null;
  try {
    const u = new URL(input);
    if (u.protocol !== "https:" || u.username || u.password || u.port || u.search || u.hash) return null;
    const allowed = (u.hostname === "hq.houseol.com.tw" && /^\/images\/pictures\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(u.pathname)) || (u.hostname === "prms.pacific.com.tw" && /^\/Uploads\/Object\/[a-z0-9/_-]+\.(?:jpe?g|png|webp)$/i.test(u.pathname));
    return allowed ? u.href : null;
  } catch { return null; }
}
const listingCache = new Map<string, { expires: number; listing: { source: ReturnType<typeof parsePacificUrl>; property: ReturnType<typeof mapPacificProperty>; images: string[]; warnings: string[] } }>();
export async function loadPacificListing(input: string, fetcher: typeof fetch = fetch, useImageCache = false) {
  const source = parsePacificUrl(input);
  const cached = listingCache.get(source.saleId);
  if (useImageCache && cached && cached.expires > Date.now()) return cached.listing;
  const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0", Referer: `${site}/` };
  const page = new TextDecoder().decode((await boundedFetch(source.sourceUrl, 250000, headers, fetcher)).bytes);
  const tag = page.match(/<[^>]+id=["']baseAuthorization["'][^>]*>/i)?.[0];
  const authorization = tag?.match(/href=["']([^"']*)["']/i)?.[1];
  if (!authorization || authorization.length > 4000) throw new PacificImportError("來源頁面格式已變更，暫時無法匯入。");
  // This is the public page's own API header; never persisted or returned to clients.
  const apiHeaders = { ...headers, Authorization: authorization };
  const picturesRequest = boundedFetch(`${site}/api/ObjectAPI/GetObjectPicture/${source.saleId}`, 250000, apiHeaders, fetcher).catch(() => null);
  const detail = await boundedFetch(`${site}/api/ObjectAPI/GetObjectDetail/${source.saleId}`, 250000, apiHeaders, fetcher);
  let raw: Record<string, unknown>;
  try { raw = JSON.parse(new TextDecoder().decode(detail.bytes)); } catch { throw new PacificImportError("來源資料格式不正確，請稍後重試。"); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new PacificImportError("來源物件資料不完整。");
  const property = mapPacificProperty(raw, source);
  let images: string[] = []; const warnings: string[] = [];
  try {
    const pictureResponse = await picturesRequest;
    if (!pictureResponse) throw new Error();
    const pictures = JSON.parse(new TextDecoder().decode(pictureResponse.bytes));
    if (!Array.isArray(pictures)) throw new Error();
    images = [...new Set<string>(pictures.filter(p => p && p.saleID === source.saleId).map(p => safePacificImageUrl(p.sysFileName)).filter((p): p is string => Boolean(p)))];
    if (images.length > PACIFIC_IMAGE_LIMIT) warnings.push(`圖片最多匯入${PACIFIC_IMAGE_LIMIT}張，剩餘圖片請自行上傳。`);
    images = images.slice(0, PACIFIC_IMAGE_LIMIT);
    if (!images.length) warnings.push("沒有可匯入圖片，請自行上傳原檔。");
  } catch { warnings.push("來源圖片清單暫時無法讀取，請自行上傳原檔。"); }
  const listing = { source, property, images, warnings };
  if (listingCache.size >= 30) listingCache.delete(listingCache.keys().next().value!);
  listingCache.set(source.saleId, { expires: Date.now() + 5 * 60 * 1000, listing });
  return listing;
}
