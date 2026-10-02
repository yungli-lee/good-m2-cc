import { z } from "zod";
import { collectionDistricts, collectionTypes, type CollectionFilters } from "../properties/collection-link.ts";

export const needsSchema = z.object({
  intent: z.enum(["buy", "sell", "rent", "let", "question"]).default("buy"),
  districts: z.array(z.enum(collectionDistricts as [string, ...string[]])).max(6).default([]),
  type: z.enum(["", ...Object.keys(collectionTypes)] as [string, ...string[]]).default(""),
  minPrice: z.number().min(0).max(100000000).nullable().default(null),
  maxPrice: z.number().min(0).max(100000000).nullable().default(null),
  mustHave: z.string().max(160).default("")
}).refine(v => v.minPrice === null || v.maxPrice === null || v.minPrice <= v.maxPrice, "預算範圍不正確");
export type Needs = z.infer<typeof needsSchema>;
export const chatSchema = z.object({
  role: z.enum(["amei", "ayong"]).default("amei"),
  message: z.string().trim().min(1).max(500),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(1200) })).max(10).default([]),
  needs: needsSchema.default({})
});
export function needsFilters(needs: Needs): CollectionFilters {
  return { q: "", city: "", districts: needs.districts, type: needs.type as CollectionFilters["type"],
    ...(needs.minPrice !== null ? { minPrice: needs.minPrice } : {}), ...(needs.maxPrice !== null ? { maxPrice: needs.maxPrice } : {}) };
}
export function redactContact(text: string) {
  return text.replace(/09[\d\s-]{8,14}/g, "[電話已隱藏]").replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[Email已隱藏]");
}
export function inferNeeds(message: string, previous: Needs): Needs {
  const text = message.normalize("NFKC");
  const found = collectionDistricts.filter(d => text.includes(d.replace(/[鄉鎮市]$/, "")) && !(d === "彰化市" && text.includes("彰化縣") && !text.includes("彰化市")));
  const intent = /出租|招租/.test(text) ? "let" : /委託|出售|賣屋|賣房|賣地/.test(text) ? "sell" : /租屋|租房|承租/.test(text) ? "rent" : /貸款|稅|流程|斡旋/.test(text) ? "question" : /想買|買屋|買房|買地|找.*(?:住宅|房|地|物件)/.test(text) ? "buy" : previous.intent;
  const base = intent === previous.intent ? previous : needsSchema.parse({ intent });
  const types: Array<[string, string]> = [["工業用地", "industrial_land"], ["農地", "farmland"], ["建地", "building_land"], ["農舍", "farmhouse"], ["透天", "townhouse"], ["公寓", "apartment"], ["華廈", "building"], ["大樓", "building"], ["店面", "storefront"], ["廠房", "factory"], ["住宅", "residential"]];
  const type = types.find(([word]) => text.includes(word))?.[1] ?? base.type;
  const range = text.match(/(\d+(?:\.\d+)?)\s*(?:萬)?\s*[~～至到-]\s*(\d+(?:\.\d+)?)\s*萬/);
  const below = text.match(/(\d+(?:\.\d+)?)\s*萬\s*(?:以內|以下|內)/) || text.match(/(?:預算|最多|上限)\s*(\d+(?:\.\d+)?)\s*萬/);
  const above = text.match(/(\d+(?:\.\d+)?)\s*萬\s*(?:以上|起)/);
  const important = ["孝親房", "電梯", "車位", "平面車位", "無障礙", "近學校"].filter(v => text.includes(v));
  return needsSchema.parse({ ...base, intent, districts: found.length ? found : base.districts, type,
    minPrice: range ? Number(range[1]) : above ? Number(above[1]) : base.minPrice,
    maxPrice: range ? Number(range[2]) : below ? Number(below[1]) : base.maxPrice,
    mustHave: [...new Set([...base.mustHave.split("、").filter(Boolean), ...important])].join("、").slice(0, 160) });
}
export function needsSummary(n: Needs) {
  const intent = { buy: "找物件", sell: "委託出售", rent: "承租需求", let: "委託出租", question: "購屋諮詢" }[n.intent];
  return [intent, n.districts.join("、") || "地區待確認", n.type ? collectionTypes[n.type as keyof typeof collectionTypes].label : "類型待確認",
    n.minPrice !== null || n.maxPrice !== null ? `預算：${n.minPrice ?? "不限"}～${n.maxPrice ?? "不限"}萬` : "預算待確認", n.mustHave ? `必要條件：${n.mustHave}` : ""].filter(Boolean).join("；");
}
