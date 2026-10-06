import { hasExplicitViewingIntent } from "./viewing-intent.ts";
export function isPropertyRejection(text: string) {
  return /不要這[間件]|這[間件房子].{0,8}不要|不喜歡這[間件]|太舊.{0,5}不要/.test(text.normalize("NFKC"));
}
export function dialogAction(text: string, hasFocus = false) {
  if (/想找|我要找|幫.*找|改找|重新找|換個地區|換.*物件|換一[間件]|另外找|其他物件|別的物件|看看別的|其他.*推薦|先不看/.test(text) || isPropertyRejection(text)) return "search";
  if (hasExplicitViewingIntent(text)) return "viewing";
  if (/議價|降價|殺價|便宜|好貴|太貴|出價|價格.*(?:低|談|降)|(?:萬|元).{0,12}(?:有機會|可以嗎|可不可以|能不能|願意|會賣|能買|成交)/.test(text)) return "offer";
  if (/這[一]?[間件]|那[一]?[間件]|第[一二三四五六1-6][間件]|屋況|屋齡|格局|開價|價格多少|多少錢/.test(text)) return "property";
  if (/聯絡我|聯繫我|我姓|我叫|電話|手機/.test(text)) return "contact";
  return hasFocus ? "property" : "search";
}
export function referencedSlug(text: string, candidates: {slug: string; title: string}[], previous: string) {
  const ordinal = text.match(/第([一二三四五六1-6])[間件]/);
  if (ordinal) return candidates[["一", "二", "三", "四", "五", "六"].includes(ordinal[1]) ? "一二三四五六".indexOf(ordinal[1]) : Number(ordinal[1]) - 1]?.slug || "";
  const named = candidates.filter(p => text.includes(p.title));
  if (named.length === 1) return named[0].slug;
  return previous || (candidates.length === 1 ? candidates[0].slug : "");
}
