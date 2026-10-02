export function viewingTime(text: string, previous = "") {
  const date = text.match(/後天|明天|今天|本週[一二三四五六日天]|下週[一二三四五六日天]|(?:週|星期)[一二三四五六日天]|週末|平日|\d{1,2}[月/]\d{1,2}日?/)?.[0];
  const time = text.match(/(?:(?:上午|下午|晚上|早上|中午)\s*)?(?:\d{1,2}|[一二兩三四五六七八九十]{1,3})(?:[:：]\d{2}|點(?:半|\d{1,2}分)?)|上午|下午|晚上|早上|中午/)?.[0];
  const oldDate = previous.match(/後天|明天|今天|本週[一二三四五六日天]|下週[一二三四五六日天]|(?:週|星期)[一二三四五六日天]|週末|平日|\d{1,2}[月/]\d{1,2}日?/)?.[0];
  if (!date && !time) return previous;
  return `${date || oldDate || ""}${time || (oldDate && date === oldDate ? previous.slice(oldDate.length) : "")}`.slice(0, 80);
}
