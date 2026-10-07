import { parsePastedProperty } from "./ai-parser";

const ALLOWED_HOSTS = new Set(["pacific.com.tw", "www.pacific.com.tw"]);

export function normalizePacificPropertyUrl(input: string) {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error("網址格式不正確"); }
  if (url.protocol !== "https:" || url.port || url.username || url.password) throw new Error("僅支援標準 https 網址");
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new Error("目前只支援太平洋房屋 pacific.com.tw");
  if (!/^\/object\/objectdetail\/?$/i.test(url.pathname)) throw new Error("這不是太平洋房屋物件詳細頁網址");
  const id = url.searchParams.get("saleID") || url.searchParams.get("saleid");
  if (!id || !/^[a-z0-9]+$/i.test(id)) throw new Error("網址缺少有效 saleID");
  return "https://www.pacific.com.tw/Object/ObjectDetail/?saleID=" + encodeURIComponent(id);
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/[\r\n]+/g, " ").trim()
    : "";
}

export function parsePacificProperty(data: unknown, sourceUrl: string) {
  const source = new URL(normalizePacificPropertyUrl(sourceUrl));
  const id = source.searchParams.get("saleID")!;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("太平洋房屋未回傳物件資料");
  const item = data as Record<string, unknown>;
  if (text(item.saleID).toUpperCase() !== id.toUpperCase() || !text(item.objectName) || !(Number(item.idx) > 0)) {
    throw new Error("無法確認這個物件，未填入任何資料");
  }
  if (Number(item.hasSellAndRent) !== 1) throw new Error("目前僅支援出售物件");
  const lines: string[] = [];
  const add = (label: string, value: unknown) => { const v = text(value); if (v) lines.push(label + "：" + v); };
  const number = (value: unknown) => { const v = Number(value); return value != null && value !== "" && Number.isFinite(v) && v >= 0 ? v : undefined; };
  const company = text(item.company).toUpperCase();
  const area = (key: string) => {
    const v = number(item[key]);
    return v === undefined ? undefined : company === "PRMS" ? Math.floor(v * 0.3025 * 100) / 100 : v;
  };
  const isLand = Number(item.objectCate) === 1;
  const parts = ["mainBuildArea", "outbuildingArea", "pubFacilityArea", "pubStallArea", "ownerStallArea"];
  const values = parts.map(key => number(item[key]));
  const sum = values.every(v => v !== undefined) ? values.reduce<number>((s, v) => s + (v || 0), 0) : undefined;
  const building = sum === undefined ? number(item.totalArea) : company === "PRMS" ? Math.floor(sum * 0.3025 * 100) / 100 : Math.round(sum * 100) / 100;
  add("案名", item.objectName);
  // Only the property's address is allowed; storeAddress and page footer are never read.
  add("地址", item.address);
  add("縣市", item.cityName);
  add("行政區", item.areaName);
  add("總價", number(item.sellTotalPrice));
  add("地坪", number(item.landArea));
  if (!isLand) add("建坪", building);
  if (!isLand) {
    const rooms = number(item.layoutRoom), halls = number(item.layoutHall), baths = number(item.layoutToilet);
    if (Number(item.layoutRoom) === -1) add("格局", "開放式格局");
    else if (rooms !== undefined && halls !== undefined && baths !== undefined) add("格局", rooms + "房" + halls + "廳" + baths + "衛");
    const age = text(item.objectAge);
    const years = age.match(/(\d+(?:\.\d+)?)\s*年/);
    const months = age.match(/(\d+)\s*(?:個)?月/);
    add("屋齡", years || months ? Math.round((Number(years?.[1] || 0) + Number(months?.[1] || 0) / 12) * 100) / 100 : number(item.objectAge));
    const floor = text(item.onWhichFloor);
    if (floor && floor !== "-99") add("樓層", floor + "樓" + (number(item.buildingAboveFloor) ? "／共" + item.buildingAboveFloor + "樓" : ""));
    add("朝向", item.directionName);
    add("型態", item.attributName);
    add("現況", item.useStatusName);
    add("停車位", Number(item.hasStall) === 2 ? "無" : Number(item.hasStall) === 1 ? (/平面/.test(text(item.stallTypeName)) ? "平面車位" : /機械/.test(text(item.stallTypeName)) ? "機械車位" : item.stallTypeName) : "");
  }
  const fee = number(item.adminFee);
  if (!isLand && fee !== undefined) {
    add("管理費", fee);
    const payment = text(item.payAdminFeeTypeName) || ({ "1": "月繳", "2": "季繳", "3": "年繳" } as Record<string, string>)[text(item.payAdminFeeType)] || "";
    if (["月繳", "雙月繳", "季繳", "年繳", "一次繳"].includes(payment)) add("管理費繳費方式", payment);
  }
  add("推薦特色", item.objFeature1);
  const notes = [
    "太平洋物件編號 " + id,
    "來源網址 " + source.toString(),
    ...(!isLand ? [["主建物", area("mainBuildArea")], ["附屬建物", area("outbuildingArea")], ["公共設施", area("pubFacilityArea")]].filter(([, v]) => v !== undefined).map(([k, v]) => k + " " + v + "坪") : []),
    ...(number(item.adminFee) ? ["管理費 " + item.adminFee + "元 " + text(item.payAdminFeeTypeName)] : [])
  ];
  add("內部備註", notes.join("；"));
  const rawText = lines.join("\n");
  const parsed = parsePastedProperty(rawText);
  parsed.address_private = notes.join("\n");
  parsed.slug = "pacific-" + id.toLowerCase();
  const type = text(item.attributName);
  // Type inference must use the property type, not the land-area label.
  parsed.property_type = /農舍/.test(type) ? "farmhouse" : /透天|別墅/.test(type) ? "townhouse" : /華廈|大樓/.test(type) ? "building" : /公寓/.test(type) ? "apartment" : /店面/.test(type) ? "storefront" : /廠房/.test(type) ? "factory" : isLand ? (/農|田/.test(type) ? "farmland" : /工業/.test(type) ? "industrial_land" : /建/.test(type) ? "building_land" : "land") : "other";
  return { rawText, parsed };
}
