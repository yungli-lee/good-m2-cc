export type ViewingNudge = "none" | "soft" | "direct";

const explicitViewingPattern = /(?:想|要|可以|能不能|能否|方便)?.{0,5}(?:看屋|看房|帶看|現場看看|去看|預約)|(?:想|要|可以|能不能|能否).{0,4}看(?:這間|一下|現場)?|(?:週末|星期[一二三四五六日天]|禮拜[一二三四五六日天]|今天|明天|後天).{0,10}(?:看|有空|方便)|什麼時候.{0,6}(?:看|方便)|何時.{0,6}(?:看|方便)/;
const declineViewingPattern = /(?:先|暫時)?(?:不用|不要|不急|先看看|再看看|之後再說|改天再說|先不用|暫時不用).{0,6}(?:看屋|看房|帶看|現場|預約)?/;
const propertyDepthPattern = /屋況|採光|停車|格局|房間|浴室|樓層|增建|漏水|屋齡|管理|附近|周邊|位置|地點|路寬|面寬|價格|議價|開價|租金|現況|裝潢|用途/;

export function hasExplicitViewingIntent(text: string) {
  const normalized = text.normalize("NFKC");
  if (declineViewingPattern.test(normalized)) return false;
  return explicitViewingPattern.test(normalized);
}

export function hasViewingDecline(text: string) {
  return declineViewingPattern.test(text.normalize("NFKC"));
}

export function isPropertyDepthQuestion(text: string) {
  return propertyDepthPattern.test(text.normalize("NFKC"));
}

export function viewingNudge(input: {
  latestText: string;
  focusedTurns: number;
  declined: boolean;
}) : ViewingNudge {
  const text = input.latestText.normalize("NFKC");
  if (hasExplicitViewingIntent(text)) return "direct";
  if (input.declined || hasViewingDecline(text)) return "none";
  if (input.focusedTurns >= 3) return "soft";
  if (input.focusedTurns >= 2 && isPropertyDepthQuestion(text)) return "soft";
  return "none";
}
