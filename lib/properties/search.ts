export type PropertySearchRow = {
  title?: string | null;
  address_public?: string | null;
  city?: string | null;
  district?: string | null;
  layout?: string | null;
  highlights?: string[] | string | null;
  description?: string | null;
};

const propertyTypeKeywords: Array<[string, string]> = [
  ["工業用地", "industrial_land"],
  ["農舍", "farmhouse"],
  ["農地", "farmland"],
  ["建地", "building_land"],
  ["廠房", "factory"],
  ["大廈", "building"],
  ["公寓", "apartment"],
  ["透天", "townhouse"],
  ["房屋", "townhouse"],
  ["店面", "storefront"]
];

export type ParsedPropertySearch = {
  keywords: string[];
  propertyTypes: string[];
  price: number | null;
  priceMode: "below" | "above" | "around" | null;
};

function normalizeSearchInput(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[，、；;｜|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const changhuaDistrictNames = [
  "彰化市", "員林市", "鹿港鎮", "和美鎮", "北斗鎮", "溪湖鎮", "田中鎮", "二林鎮",
  "線西鄉", "伸港鄉", "福興鄉", "秀水鄉", "花壇鄉", "芬園鄉", "大村鄉", "埔鹽鄉",
  "埔心鄉", "永靖鄉", "社頭鄉", "二水鄉", "田尾鄉", "埤頭鄉", "芳苑鄉", "大城鄉",
  "竹塘鄉", "溪州鄉"
];

const districtAliases = changhuaDistrictNames
  .flatMap((name) => [name, name.replace(/[市鎮鄉]$/, "")])
  .sort((left, right) => right.length - left.length);

function splitCompactLocationKeyword(keyword: string) {
  const district = districtAliases.find((name) => keyword.startsWith(name) && keyword.length > name.length);
  if (!district) return [keyword];

  const road = keyword.slice(district.length);
  if (!/(?:路|街|大道|巷|弄|段)/.test(road)) return [keyword];
  return [district, road];
}

export function escapePropertySearchTerm(value: string) {
  return value.replace(/[%_,()."'\\]/g, "").trim();
}

const chineseDigits: Record<string, string> = {
  一: "1", 二: "2", 兩: "2", 三: "3", 四: "4", 五: "5",
  六: "6", 七: "7", 八: "8", 九: "9", 十: "10"
};

export function propertySearchKeywordVariants(keyword: string) {
  const numericLayout = keyword.replace(/^([一二兩三四五六七八九十])(?=房|廳|衛)/, (digit) => chineseDigits[digit] || digit);
  return numericLayout === keyword ? [keyword] : [keyword, numericLayout];
}

export function parsePropertySearch(input = ""): ParsedPropertySearch {
  let residual = normalizeSearchInput(input);
  let propertyTypes: string[] = [];

  for (const [keyword, value] of propertyTypeKeywords) {
    if (!propertyTypes.length && residual.includes(keyword)) propertyTypes = [value];
    residual = residual.replaceAll(keyword, " ");
  }

  if (!propertyTypes.length && residual.includes("土地")) {
    propertyTypes = ["farmland", "building_land", "industrial_land"];
    residual = residual.replaceAll("土地", " ");
  }

  // A bare number in "三房" or "50坪" is not a price. Price requires 萬 or a range modifier.
  const priceMatch = residual.match(/(\d+(?:\.\d+)?)\s*(?:萬(?:元)?\s*(以下|以內|內|以上|起)?|(以下|以內|內|以上|起))/);
  let price: number | null = null;
  let priceMode: ParsedPropertySearch["priceMode"] = null;
  if (priceMatch) {
    const amount = Number(priceMatch[1]);
    if (Number.isFinite(amount) && amount > 0) {
      price = Math.round(amount);
      const modifier = priceMatch[2] || priceMatch[3] || "";
      priceMode = /以下|以內|內/.test(modifier)
        ? "below"
        : /以上|起/.test(modifier)
          ? "above"
          : "around";
      residual = residual.replace(priceMatch[0], " ");
    }
  }

  const keywords = normalizeSearchInput(residual)
    .split(" ")
    .map(escapePropertySearchTerm)
    .filter(Boolean)
    .flatMap(splitCompactLocationKeyword);

  return { keywords, propertyTypes, price, priceMode };
}

function text(value: unknown) {
  if (Array.isArray(value)) return value.join(" ").toLowerCase();
  return String(value || "").toLowerCase();
}

function keywordScore(row: PropertySearchRow, keyword: string) {
  const term = keyword.toLowerCase();
  const district = text(row.district);
  const address = text(row.address_public);
  const city = text(row.city);
  const title = text(row.title);
  const layout = text(row.layout);
  const highlights = text(row.highlights);
  const description = text(row.description);

  // Actual administrative location must outrank marketing copy such as "近鹿港".
  if (district === term || district === `${term}鎮` || district === `${term}鄉` || district === `${term}市`) return 500;
  if (district.includes(term)) return 450;
  if (address.includes(term)) return 400;
  if (city.includes(term)) return 350;
  if (layout.includes(term)) return 300;
  if (title.includes(term)) return 220;
  if (highlights.includes(term)) return 140;
  if (description.includes(term)) return 80;
  return 0;
}

function bestKeywordScore(row: PropertySearchRow, keyword: string) {
  return Math.max(...propertySearchKeywordVariants(keyword).map((variant) => keywordScore(row, variant)));
}

export function rankPropertySearchResults<T extends PropertySearchRow>(rows: T[], keywords: string[], limit: number) {
  if (!keywords.length) return rows.slice(0, limit);

  return rows
    .map((row, index) => ({
      row,
      index,
      score: keywords.reduce((total, keyword) => total + bestKeywordScore(row, keyword), 0)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map(({ row }) => row);
}
