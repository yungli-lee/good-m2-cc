export type ParsedProperty = {
  title?: string;
  slug?: string;
  address_public?: string;
  address_private?: string;
  listing_no?: string;
  listing_type?: string;
  listing_start_date?: string;
  listing_end_date?: string;
  owner_name?: string;
  owner_phone?: string;
  developer_names?: string;
  showing_instructions?: string;
  service_fee_rate?: string;
  floor_price?: string;
  frontage?: string;
  depth?: string;
  price?: string;
  land_area_ping?: string;
  building_area_ping?: string;
  layout?: string;
  age?: string;
  orientation?: string;
  floor?: string;
  property_type?: string;
  highlights?: string;
  description?: string;
  seo_title?: string;
  meta_description?: string;
};

const fieldAliases: Array<[keyof ParsedProperty | "lot_number" | "main_building" | "balcony" | "shared_area" | "completion_date" | "internal_notes", RegExp]> = [
  ["title", /^(案名|物件名稱|社區|標題)$/],
  ["address_public", /^(地址|公開地址|座落)$/],
  ["address_private", /^(完整地址|私有地址|後台地址)$/],
  ["listing_no", /^(委託書編號|委託編號)$/],
  ["listing_type", /^(委託類型)$/],
  ["owner_name", /^(屋主名稱|屋主)$/],
  ["owner_phone", /^(屋主電話)$/],
  ["developer_names", /^(開發|開發人員|承辦|業務)$/],
  ["showing_instructions", /^(帶看|帶看資訊|帶看方式)$/],
  ["frontage", /^(面寬)$/],
  ["depth", /^(深度)$/],
  ["lot_number", /^(地號)$/],
  ["land_area_ping", /^(地坪|土地|土地坪數)$/],
  ["building_area_ping", /^(建坪|權狀|建物|建物坪數|總坪)$/],
  ["main_building", /^(主建坪|主建物)$/],
  ["balcony", /^(陽台)$/],
  ["shared_area", /^(共有|公設|附屬|附屬建物)$/],
  ["layout", /^(格局)$/],
  ["orientation", /^(坐向|座向|朝向)$/],
  ["age", /^(屋齡)$/],
  ["completion_date", /^(完工日|完工日期|建築完成日|使照日期)$/],
  ["price", /^(開價|售價|總價)$/],
  ["floor_price", /^(底價)$/],
  ["service_fee_rate", /^(服務費|服務費%|仲介服務費)$/],
  ["floor", /^(樓層|樓高)$/],
  ["highlights", /^(推薦特色|特色|賣點|亮點)$/],
  ["internal_notes", /^(內部備註|密碼|鑰匙|門牌|聯絡|管理室|租金)$/]
];

const incomingCategoryPattern = /新接物件\s*[-－—]\s*(透天|土地|大樓華廈|大樓|華廈)/;

function normalizeText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u3000/g, " ").trim();
}

function extractLabeledLines(text: string) {
  const result = new Map<string, string>();
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim().replace(/^[-*•\d.、\s]+/, "");
    const match = line.match(/^([^:：]{1,12})\s*[:：]\s*(.+)$/);
    if (!match) continue;
    result.set(match[1].trim(), match[2].trim());
  }
  return result;
}

function extractSection(text: string, labels: string[]) {
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!labels.some((label) => new RegExp(`^${label}\\s*[:：]\\s*$`).test(line))) continue;

    const section: string[] = [];
    for (const nextLine of lines.slice(index + 1)) {
      const trimmed = nextLine.trim();
      if (!trimmed) {
        if (section.length) break;
        continue;
      }
      if (/^[^:：]{1,12}\s*[:：]/.test(trimmed)) break;
      section.push(trimmed);
    }
    return section.join("\n");
  }
  return "";
}

function findAliasField(label: string) {
  return fieldAliases.find(([, pattern]) => pattern.test(label))?.[0];
}

function extractValue(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:：]?\\s*([^\\n,，。；;]+)`, "i");
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function publicAddressFromFull(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.+?(?:路|街|大道|段))(?:\d|[一二三四五六七八九十百]+巷|[一二三四五六七八九十百]+弄|[一二三四五六七八九十百]+號|$)/);
  return (match?.[1] || trimmed)
    .replace(/\d+巷.*$/, "")
    .replace(/\d+弄.*$/, "")
    .replace(/\d+號.*$/, "")
    .trim();
}

function normalizeNumber(value: string) {
  const cleaned = value.replace(/,/g, "").replace(/[坪元\s]/g, "");
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  return match ? match[1] : "";
}

function normalizePrice(value: string) {
  const cleaned = value.replace(/,/g, "");
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return "";
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return "";
  return String(Math.round(number));
}

function normalizeSlug(value: string, prefix = "") {
  const tokenized = [
    ["員林", "yuanlin"],
    ["彰化", "changhua"],
    ["快官", "kuaiguan"],
    ["生活圈", "life"],
    ["台鳳", "taifeng"],
    ["溪湖", "xihu"],
    ["富貴", "fugui"],
    ["新潮", "xinchao"],
    ["一樓", "1f"],
    ["二樓", "2f"],
    ["三樓", "3f"],
    ["四樓", "4f"],
    ["五樓", "5f"],
    ["三房", "3room"],
    ["二房", "2room"],
    ["四房", "4room"],
    ["五房", "5room"],
    ["幸福宅", "home"],
    ["電梯", "elevator"],
    ["公寓", "apartment"],
    ["大樓", "building"],
    ["透天", "townhouse"],
    ["土地", "land"],
    ["建地", "building-land"],
    ["農地", "farmland"],
    ["店面", "storefront"]
  ].reduce((slug, [term, replacement]) => slug.replaceAll(term, `-${replacement}-`), value);
  const ascii = [prefix, value.concat("-", tokenized)]
    .filter(Boolean)
    .join("-")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 100);
  return ascii || `property-${Date.now().toString(36)}`;
}

function normalizeLayout(value: string) {
  const slashMatch = value.match(/(\d+)\s*[/／]\s*(\d+)\s*[/／]\s*(\d+)/);
  if (slashMatch) return `${slashMatch[1]}房${slashMatch[2]}廳${slashMatch[3]}衛`;

  const match = value.match(/(\d+)\s*房\s*(\d+)?\s*廳?\s*(\d+)?\s*衛?/);
  if (!match) return value.trim();
  const rooms = match[1] || "0";
  const living = match[2] || "0";
  const baths = match[3] || "0";
  return `${rooms}房${living}廳${baths}衛`;
}

function normalizeOrientation(value: string) {
  return value
    .replace(/\s*樓高\s*[:：]\s*[^\n,，。；;]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateLike(value: string) {
  const western = value.match(/(20\d{2}|19\d{2})[/-年.](\d{1,2})(?:[/-月.](\d{1,2}))?/);
  if (western) return { year: Number(western[1]), month: Number(western[2] || 1) };

  const roc = value.match(/(?:民國)?(\d{2,3})[/-年.](\d{1,2})(?:[/-月.](\d{1,2}))?/);
  if (roc) return { year: Number(roc[1]) + 1911, month: Number(roc[2] || 1) };

  return null;
}

function normalizeDateText(value: string) {
  const date = value.trim().match(/(20\d{2}|19\d{2})[/-年.](\d{1,2})(?:[/-月.](\d{1,2}))?/);
  if (!date) return value.trim();
  return `${date[1]}/${date[2].padStart(2, "0")}/${(date[3] || "1").padStart(2, "0")}`;
}

function calculateAgeFromDate(value: string) {
  const date = parseDateLike(value);
  if (!date) return "";
  const now = new Date();
  const years = now.getFullYear() - date.year + (now.getMonth() + 1 - date.month) / 12;
  return years >= 0 ? (Math.round(years * 10) / 10).toString() : "";
}

function inferType(text: string) {
  const incomingCategory = text.match(incomingCategoryPattern)?.[1];
  if (incomingCategory === "透天") return "townhouse";
  if (incomingCategory === "土地") return "land";
  if (incomingCategory === "大樓華廈" || incomingCategory === "大樓" || incomingCategory === "華廈") return "building";

  if (/農地/.test(text)) return "farmland";
  if (/建地/.test(text)) return "building_land";
  if (/土地/.test(text)) return "land";
  if (/透天|別墅/.test(text)) return "townhouse";
  if (/店面|店鋪/.test(text)) return "storefront";
  if (/廠房|工業/.test(text)) return "factory";
  if (/公寓/.test(text)) return "apartment";
  if (/大樓|華廈|電梯/.test(text)) return "building";
  return "other";
}

function inferFloor(text: string) {
  const floorMatch = text.match(/([一二三四五六七八九十\d]+)\s*樓\s*透天/);
  if (!floorMatch) return "";
  return `${floorMatch[1]}樓透天`;
}

function extractCompletionDate(value: string) {
  const match = value.match(/((?:\d{2,4})[/-年.]\d{1,2}(?:[/-月.]\d{1,2})?)\s*完工/);
  return match?.[1] || "";
}

function extractLeadingDate(text: string) {
  const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean) || "";
  const match = firstLine.match(/^(20\d{2})(\d{2})(\d{2})$/);
  return match ? `${match[1]}${match[2]}${match[3]}` : "";
}

function parseListingPeriod(value: string) {
  const datePattern = /(20\d{2}|19\d{2})[/-年.]\d{1,2}(?:[/-月.]\d{1,2})?/g;
  const dates = value.match(datePattern) || [];
  if (dates.length >= 2) {
    const [start, end] = dates as [string, string, ...string[]];
    return {
      start: normalizeDateText(start),
      end: normalizeDateText(end)
    };
  }

  const [start = "", end = ""] = value.split(/\s*[-~～至到]\s*/);
  return {
    start: start ? normalizeDateText(start) : "",
    end: end ? normalizeDateText(end) : ""
  };
}

function collectHighlights(text: string, labeledHighlights: string) {
  const source = labeledHighlights || extractSection(text, ["推薦特色", "特色", "賣點", "亮點"]);
  const delimiter = source.includes("\n") ? /\n/ : /[,，、\n]/;
  const lines = source
    .split(delimiter)
    .map((item) => item.replace(/^[-*•\d.、\s]+/, "").trim())
    .filter(Boolean);

  if (!lines.length) {
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (/近|採光|邊間|學區|商圈|公園|捷運|車位|稀有|全新|美裝|低總價/.test(line) && line.length <= 32) {
        lines.push(line.replace(/^[-*•\d.、\s]+/, ""));
      }
    }
  }

  return Array.from(new Set(lines)).slice(0, 8).join("\n");
}

function compactMetaDescription(parts: string[]) {
  return parts.filter(Boolean).join("，").replace(/\s+/g, " ").slice(0, 150);
}

function extractIncomingCategory(text: string) {
  return text.match(incomingCategoryPattern)?.[1] || "";
}

export function parsePastedProperty(rawText: string): ParsedProperty {
  const text = normalizeText(rawText);
  const labeled = extractLabeledLines(text);
  const parsed: ParsedProperty = {};
  const internalNotes: string[] = [];

  for (const [label, value] of labeled.entries()) {
    if (label === "委託期間") {
      const period = parseListingPeriod(value);
      parsed.listing_start_date ||= period.start;
      parsed.listing_end_date ||= period.end;
      continue;
    }
    const field = findAliasField(label);
    if (!field) continue;
    if (field === "address_public") {
      if (/^(地址|座落)$/.test(label)) {
        parsed.address_public = publicAddressFromFull(value);
        internalNotes.unshift(`完整地址：${value}`);
      } else {
        parsed.address_public = value;
      }
      continue;
    }
    if (field === "lot_number" || field === "main_building" || field === "balcony" || field === "shared_area" || field === "completion_date" || field === "internal_notes") {
      internalNotes.push(`${label}：${value}`);
      if (field === "completion_date" && !parsed.age) parsed.age = calculateAgeFromDate(value);
      continue;
    }
    parsed[field] ||= value;
    if (field === "age") {
      const completionDate = extractCompletionDate(value);
      if (completionDate) internalNotes.push(`完工日：${completionDate}`);
    }
  }

  parsed.title ||= extractValue(text, ["案名", "物件名稱", "社區"]);
  parsed.address_public ||= extractValue(text, ["公開地址"]);
  if (!parsed.address_public) {
    const fullAddress = extractValue(text, ["地址", "座落"]);
    if (fullAddress) {
      parsed.address_public = publicAddressFromFull(fullAddress);
      if (!internalNotes.some((note) => note.startsWith("完整地址："))) internalNotes.unshift(`完整地址：${fullAddress}`);
    }
  }
  parsed.price ||= extractValue(text, ["開價", "售價", "總價"]);
  parsed.floor_price ||= extractValue(text, ["底價"]);
  parsed.service_fee_rate ||= extractValue(text, ["服務費%", "服務費", "仲介服務費"]);
  parsed.land_area_ping ||= extractValue(text, ["地坪", "土地坪數"]);
  parsed.building_area_ping ||= extractValue(text, ["建坪", "建物坪數", "權狀"]);
  parsed.layout ||= extractValue(text, ["格局"]);
  parsed.orientation ||= extractValue(text, ["坐向", "座向", "朝向"]);
  parsed.floor ||= extractValue(text, ["樓層", "樓高"]);

  const titleLine = text.split("\n").map((line) => line.trim()).find((line) => line && !line.includes("：") && !line.includes(":") && !/^\d{8}$/.test(line) && !incomingCategoryPattern.test(line) && line.length <= 60);
  parsed.title ||= titleLine || "未命名物件";
  const incomingCategory = extractIncomingCategory(text);
  if (incomingCategory && parsed.title === `新接物件-${incomingCategory}`) {
    parsed.title = `${incomingCategory}新接物件`;
  }

  const priceMatch = text.match(/(?:開價|售價|總價)?\s*(\d[\d,]*(?:\.\d+)?)\s*萬/);
  if (!parsed.price && priceMatch) parsed.price = priceMatch[1];

  const areaMatch = text.match(/(?:建坪|權狀|建物)\s*[:：]?\s*(\d+(?:\.\d+)?)/);
  if (!parsed.building_area_ping && areaMatch) parsed.building_area_ping = areaMatch[1];

  const landMatch = text.match(/(?:地坪|土地)\s*[:：]?\s*(\d+(?:\.\d+)?)/);
  if (!parsed.land_area_ping && landMatch) parsed.land_area_ping = landMatch[1];

  const layoutMatch = text.match(/\d+\s*房\s*\d*\s*廳?\s*\d*\s*衛?/);
  if (!parsed.layout && layoutMatch) parsed.layout = layoutMatch[0];

  const ageMatch = text.match(/屋齡\s*[:：]?\s*(\d+(?:\.\d+)?)/);
  if (!parsed.age && ageMatch) parsed.age = ageMatch[1];
  const completionInAge = text.match(/屋齡\s*[:：]?\s*[^\n]*?((?:\d{2,4})[/-年.]\d{1,2}(?:[/-月.]\d{1,2})?)\s*完工/);
  if (completionInAge && !internalNotes.some((note) => note.startsWith("完工日："))) {
    internalNotes.push(`完工日：${completionInAge[1]}`);
  }

  if (!parsed.age) {
    const completion = extractValue(text, ["完工日", "完工日期", "建築完成日", "使照日期"]);
    if (completion) parsed.age = calculateAgeFromDate(completion);
  }

  parsed.price = parsed.price ? normalizePrice(parsed.price) : "";
  parsed.land_area_ping = parsed.land_area_ping ? normalizeNumber(parsed.land_area_ping) : "";
  parsed.building_area_ping = parsed.building_area_ping ? normalizeNumber(parsed.building_area_ping) : "";
  parsed.layout = parsed.layout ? normalizeLayout(parsed.layout) : "";
  parsed.orientation = parsed.orientation ? normalizeOrientation(parsed.orientation) : "";
  parsed.age = parsed.age ? normalizeNumber(parsed.age) : "";
  parsed.floor ||= inferFloor(parsed.title || text);
  parsed.listing_type = parsed.listing_type === "一般" ? "一般委託" : parsed.listing_type;
  parsed.listing_type = parsed.listing_type === "口頭約" ? "口頭" : parsed.listing_type;
  parsed.property_type = inferType(text);
  parsed.slug = normalizeSlug(parsed.title, extractLeadingDate(text));
  parsed.highlights = collectHighlights(text, parsed.highlights || "");

  if (parsed.address_private) internalNotes.unshift(`完整地址：${parsed.address_private}`);
  parsed.address_private = internalNotes.join("\n").slice(0, 4000);

  parsed.description = "";
  parsed.seo_title = `${parsed.title}｜阿勇不動產顧問`.slice(0, 180);
  parsed.meta_description = compactMetaDescription([parsed.title || "", parsed.address_public || "", parsed.layout || "", parsed.price ? `開價 ${parsed.price} 萬` : ""]);

  return parsed;
}
