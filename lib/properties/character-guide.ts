import type { Property } from "./types";

// Explicit public allowlist: never serialize the full CMS record into the guide.
export type GuideProperty = Pick<Property, "title" | "city" | "district" | "price" | "land_area_ping" | "building_area_ping" | "layout" | "age" | "orientation" | "highlights" | "property_type">;
export type GuideRole = "ayong" | "amei";
export type GuideTopic = "overview" | "details" | "highlights";
export type GuideScripts = Record<GuideRole, Record<GuideTopic, string>>;

function number(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value)) || Number(value) < 0) return null;
  return Number(value).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
}

export function buildPropertyGuide(property: GuideProperty, typeLabel: string): GuideScripts {
  const location = [property.city, property.district].filter(Boolean).join("");
  const price = number(property.price);
  const overview = `這件是「${property.title}」，${location ? `位於${location}，` : ""}類型是${typeLabel}。${price && Number(property.price) > 0 ? `目前公開開價 ${price} 萬元。` : "價格歡迎直接洽詢。"}`;
  const land = number(property.land_area_ping);
  const building = number(property.building_area_ping);
  const age = number(property.age);
  const isLand = ["land", "farmland", "building_land", "industrial_land"].includes(property.property_type);
  const facts = [land ? `土地 ${land} 坪` : "", building ? `建物 ${building} 坪` : "", !isLand && property.layout ? `格局 ${property.layout}` : "", !isLand && age ? `屋齡 ${age} 年` : "", property.orientation ? `座向${property.orientation}` : ""].filter(Boolean);
  const details = facts.length ? `我幫你整理公開資料：${facts.join("；")}。` : "這件目前沒有完整的面積與格局資料，歡迎聯絡我們確認。";
  const highlights = (property.highlights || []).map(item => item.trim()).filter(Boolean).slice(0, 3).map(item => item.length > 200 ? `${item.slice(0, 200)}…` : item);
  const features = highlights.length ? `物件頁列出的特色是：${highlights.join("；")}。` : "這件目前沒有另外列出物件特色，可以先看照片與詳細介紹，再告訴我們你最在意什麼。";
  return {
    ayong: { overview: `你好，我是阿勇！${overview}想安排帶看，可以透過 LINE 找我。`, details: `${details}想了解屋況與實際使用情形，我可以陪你一起確認。`, highlights: `${features}看中哪個重點，我再為你詳細介紹！` },
    amei: { overview: `你好，我是阿美！${overview}先看看是否符合你的地區與預算，我們再一起挑。`, details: `${details}可以把你需要的空間告訴我們，再一起比較是否適合。`, highlights: `${features}也可以看看其他推薦物件，找出更符合需求的一件。` }
  };
}
