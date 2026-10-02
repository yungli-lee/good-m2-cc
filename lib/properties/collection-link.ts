export const collectionDistricts = ["彰化市", "員林市", "鹿港鎮", "和美鎮", "北斗鎮", "溪湖鎮", "田中鎮", "二林鎮", "線西鄉", "伸港鄉", "福興鄉", "秀水鄉", "花壇鄉", "芬園鄉", "大村鄉", "埔鹽鄉", "埔心鄉", "永靖鄉", "社頭鄉", "二水鄉", "田尾鄉", "埤頭鄉", "芳苑鄉", "大城鄉", "竹塘鄉", "溪州鄉"];
export const collectionTypes = {
  residential: { label: "住宅", values: ["townhouse", "apartment", "building", "storefront"] },
  farmland: { label: "農地", values: ["farmland"] },
  building_land: { label: "建地", values: ["building_land"] },
  townhouse: { label: "透天", values: ["townhouse"] },
  apartment: { label: "公寓", values: ["apartment"] },
  building: { label: "華廈／大樓", values: ["building"] },
  storefront: { label: "店面", values: ["storefront"] },
  farmhouse: { label: "農舍", values: ["farmhouse"] },
  factory: { label: "廠房", values: ["factory"] },
  industrial_land: { label: "工業用地", values: ["industrial_land"] }
} as const;
export type CollectionSearchParams = Record<string, string | string[] | undefined>;
export type CollectionFilters = { q: string; city: string; districts: string[]; type: keyof typeof collectionTypes | ""; minPrice?: number; maxPrice?: number };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";
function priceValue(value: string | string[] | undefined) {
  const raw = first(value).trim();
  if (!raw) return undefined;
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 && number <= 100000000 ? number : undefined;
}
export function collectionFilters(input: CollectionSearchParams): CollectionFilters {
  const requested = Array.isArray(input.district) ? input.district : input.district ? [input.district] : [];
  return {
    ...(priceValue(input.price_min) !== undefined ? { minPrice: priceValue(input.price_min) } : {}),
    ...(priceValue(input.price_max) !== undefined ? { maxPrice: priceValue(input.price_max) } : {}),
    q: first(input.q).trim().slice(0, 200),
    city: first(input.city).trim().slice(0, 80),
    districts: collectionDistricts.filter(d => requested.includes(d)),
    type: Object.hasOwn(collectionTypes, first(input.type)) ? first(input.type) as keyof typeof collectionTypes : ""
  };
}
export function collectionHref(filters: CollectionFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.city) params.set("city", filters.city);
  for (const district of filters.districts) params.append("district", district);
  if (filters.type) params.set("type", filters.type);
  if (filters.minPrice !== undefined) params.set("price_min", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("price_max", String(filters.maxPrice));
  return `/properties${params.size ? `?${params}` : ""}`;
}
export function collectionLabel(filters: CollectionFilters) {
  return [filters.q, filters.districts.map(d => d.replace(/[鄉鎮]$/, "")).join("、") || filters.city, filters.type ? collectionTypes[filters.type].label : "", filters.minPrice !== undefined && filters.maxPrice !== undefined ? `${filters.minPrice}～${filters.maxPrice}萬` : filters.maxPrice !== undefined ? `${filters.maxPrice}萬以下` : filters.minPrice !== undefined ? `${filters.minPrice}萬以上` : ""].filter(Boolean).join("｜") || "全部在售物件";
}
