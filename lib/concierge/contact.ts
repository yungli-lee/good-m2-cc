export function chatContact(text: string) {
  const phone = text.match(/(?<!\d)09(?:[\s-]*\d){8}(?!\d)/)?.[0].replace(/[\s-]/g, "") || "";
  const name = text.match(/(?:我叫|稱呼[：:]?|姓名[：:]?)\s*([\p{Script=Han}]{2,6}(?:先生|小姐|女士)?)/u)?.[1] || text.match(/我姓\s*([\p{Script=Han}]{1,2})(?=[，,。\s]|$)/u)?.[1] || "";
  return { phone, name };
}
export function redactChatContact(text: string) {
  return text.replace(/(?<!\d)09(?:[\s-]*\d){8}(?!\d)/g, "[電話已隱藏]")
    .replace(/我姓\s*[\p{Script=Han}]{1,2}(?=[，,。\s]|$)/gu, "[稱呼已隱藏]")
    .replace(/(?:我叫|稱呼[：:]?|姓名[：:]?)\s*[\p{Script=Han}]{2,6}(?:先生|小姐|女士)?/gu, "[稱呼已隱藏]");
}
