import type { Property } from "../properties/types";
import { formatPropertyPrice } from "../format";
import { hasViewingDecline } from "./viewing-intent.ts";
type PublicProperty = Pick<Property, "id" | "slug" | "title" | "price" | "district" | "layout" | "property_type"> & Partial<Omit<Property, "property_media">>;

// Deliberately list public facts; never serialize the full database row to chat.
export function publicConversationProperty(p: PublicProperty) {
  return { id: p.id, slug: p.slug, title: p.title, price: p.price,
    transaction_type: p.transaction_type, rent_monthly: p.rent_monthly, priceLabel: formatPropertyPrice(p),
    district: p.district, layout: p.layout, propertyType: p.property_type,
    land: p.land_area_ping, building: p.building_area_ping, age: p.age, floor: p.floor,
    above_ground_floors: p.above_ground_floors, frontage: p.frontage, depth: p.depth,
    parking: p.parking_space_features || [], parking_arrangement: p.parking_arrangement || [],
    deposit_months: p.deposit_months, minimum_lease_months: p.minimum_lease_months,
    rental_equipment: (p.rental_equipment || "").slice(0, 4000), lease_notarization_required: p.lease_notarization_required,
    highlights: Array.isArray(p.highlights) ? p.highlights.slice(0, 6) : [], description: (p.description || "").slice(0, 2000) };
}

export function focusedAnswer(p: PublicProperty, text: string, history: {role: string; text: string}[]) {
  if (/LINE|加賴|加好友/i.test(text)) return "可以，點下方「加 LINE 諮詢」就能聯絡我們，並告訴阿勇、阿美您正在看這一件。";
  if (/其他物件|重新找|不喜歡這|不要這間/.test(text)) return "了解，可以使用「看更多物件」挑選其他案件；如果這一件還有問題，也可以繼續問我。";
  let answer = "";
  const facts: string[] = [];
  if (/格局|房間|幾房|幾廳|幾衛/.test(text) && p.layout) facts.push(`公開格局為${p.layout}`);
  if (/坪|面積|大小/.test(text)) { if (p.building_area_ping != null) facts.push(`建坪${p.building_area_ping}坪`); if (p.land_area_ping != null) facts.push(`地坪${p.land_area_ping}坪`); }
  if (/設備|冷凍|蒸煮|油炸/.test(text) && p.rental_equipment) facts.push(`附帶設備：${p.rental_equipment}`);
  if (/押金/.test(text) && p.deposit_months != null) facts.push(`押金${p.deposit_months}個月`);
  if (/租期|幾年|多久|三年/.test(text) && p.minimum_lease_months != null) facts.push(`最短租期${p.minimum_lease_months}個月`);
  if (/公證/.test(text) && p.lease_notarization_required) facts.push("租約須經公證");
  if (/停車|車位/.test(text)) { const parking = [...(p.parking_space_features || []), ...(p.parking_arrangement || [])]; if (parking.length) facts.push(`停車資訊：${parking.join("、")}`); }
  if (/樓層|幾樓|幾層/.test(text)) { if (p.above_ground_floors != null) facts.push(`地上${p.above_ground_floors}層`); else if (p.floor) facts.push(`樓層資訊：${p.floor}`); }
  if (/屋齡/.test(text) && p.age != null) facts.push(`屋齡約${p.age}年`);
  if (facts.length) answer = `${facts.join("；")}。實際現況與租售條件仍由阿勇、阿美確認。`;
  else if (/介紹|重點|特色/.test(text)) answer = `「${p.title}」公開${p.transaction_type === "rent" ? "月租" : "開價"}為${formatPropertyPrice(p)}。${(p.highlights || []).slice(0, 2).join("；") || p.layout || "其他細節可繼續詢問"}。`;
  else answer = "這個細節目前公開資料還不足，我會把您的問題整理給阿勇、阿美確認，不能先替現況做保證。";
  const declined = hasViewingDecline(text) || history.some(m => m.role === "user" && hasViewingDecline(m.text));
  if (!declined && history.filter(m => m.role === "user").length >= 2 && !history.some(m => m.role === "assistant" && /想安排現場/.test(m.text))) return answer + "想安排現場確認嗎？";
  return answer;
}
